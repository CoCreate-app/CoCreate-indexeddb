/********************************************************************************
 * Copyright (C) 2023 CoCreate and Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 ********************************************************************************/

/**
 * Commercial Licensing Information:
 * For commercial use of this software without the copyleft provisions of the AGPLv3,
 * you must obtain a commercial license from CoCreate LLC.
 * For details, visit <https://cocreate.app/licenses/> or contact us at sales@cocreate.app
 */

import {
	ObjectId,
	dotNotationToObject,
	searchData,
	sortData,
	queryData,
	createUpdate,
	isEqualArray,
	isEqualObject
} from "@cocreate/utils";

let indexedDbFunction;

function init() {
	// Check for support.
	if (!("indexedDB" in window)) {
		console.log("This browser doesn't support IndexedDB.");
		setStatus(false);
		return;
	} else {
		try {
			indexedDB.databases();
			if (
				window.CoCreateConfig &&
				window.CoCreateConfig.indexeddb !== false
			)
				setStatus(true);
		} catch (e) {
			setStatus(false);
		}
	}
}

function setStatus(value) {
	if (window.CoCreateConfig) window.CoCreateConfig.indexeddb = value;
	else window.CoCreateConfig = { indexeddb: value };

	if (!value) {
		indexedDbFunction = indexedDb;
		send = value;
	} else if (!send) {
		send = indexedDbFunction;
		indexedDbFunction = true;
	}
}

async function send(data) {
	try {
		let newData = [];

		let type = data.method.split(".")[0];
		if (type === "database") {
			if (data.method === "database.get") {
				return await processDatabase(data);
			} else await processDatabase(data, newData, type);
		} else {
			if (!data["timeStamp"])
				data["timeStamp"] = new Date().toISOString();

			let databases = data.database;
			if (!databases && data.organization_id)
				databases = [data.organization_id];
			if (!Array.isArray(databases)) databases = [databases];

			let arrays = data.array || [];
			if (!Array.isArray(arrays)) arrays = [arrays];

			for (let i = 0; i < databases.length; i++) {
				let database = databases[i];
				if (type === "array") {
					await processArray(data, newData, database, type);
				} else {
					for (let j = 0; j < arrays.length; j++) {
						if (type === "index")
							await processIndex(data, newData, database, type);
						else if (type === "object")
							await processObject(
								data,
								newData,
								database,
								arrays[j],
								type
							);
					}
				}
			}
		}

		return createData(data, newData, type);
	} catch (error) {
		errorHandler(data, error);
	}
}

const dbVersion = new Map();
const processDatabase = (data, newData, type) => {
	return new Promise(
		(resolve, reject) => {
			if (!data) data = {};
			if (!data[type]) data[type] = [];

			if (data.method == "database.read") {
				indexedDB.databases().then((databases) => {
					for (let database of databases) {
						if (data.$filter && data.$filter.query) {
							let isFilter = queryData(
								database,
								data.$filter.query
							);
							if (isFilter)
								newData.push({
									$storage: ["indexeddb"],
									...database
								});
						} else
							newData.push({
								$storage: ["indexeddb"],
								...database
							});
					}

					resolve();
				});
			} else {
				let databases;
				if (data.method == "database.update")
					databases = Object.keys(data.database);
				else databases = data.database;

				if (!Array.isArray(databases)) databases = [databases];

				for (let i = 0; i < databases.length; i++) {
					let openRequest,
						database = databases[i];
					switch (data.method) {
						case "database.get":
						case "database.create":
						case "database.update":
							openRequest = indexedDB.open(database);
							break;
						case "database.delete":
							openRequest =
								indexedDB.deleteprocessDatabase(database);
							break;
						default:
							errorHandler(data, "unknown method", database);
							resolve(data);
					}

					openRequest.onsuccess = function () {
						let db = openRequest.result;

						if (data.method == "database.update") {
							let objectStoreNames = Array.from(
								db.objectStoreNames
							);
							for (let array of objectStoreNames) {
								let request = array.openCursor();

								request.onsuccess = function () {
									let cursor = request.result;
									if (cursor) {
										let value = cursor.value;

										cursor.continue();
									} else {
										// -1
									}
								};

								request.onerror = function () {
									errorHandler(
										data,
										request.error,
										database,
										array
									);
								};
							}
						} else if (data.upgrade === true) {
							db.close();

							let version =
								dbVersion.get(database) ||
								openRequest.result.version;
							resolve(
								indexedDB.open(database, Number((version += 1)))
							);
							dbVersion.set(database, version);
						} else if (data.array) {
							db.close();

							let version =
								dbVersion.get(database) ||
								openRequest.result.version;
							let request = indexedDB.open(
								database,
								Number((version += 1))
							);
							dbVersion.set(database, version);

							request.onupgradeneeded = function (event) {
								const db = event.target.result;

								let arrays = data.array;
								if (!Array.isArray(arrays)) arrays = [arrays];

								for (let j = 0; j < arrays.length; j++) {
									if (
										!db.objectStoreNames.contains(arrays[j])
									) {
										try {
											db.createObjectStore(arrays[j], {
												keyPath: "_id",
												autoIncrement: true
											});
										} catch (error) {
											errorHandler(
												data,
												error,
												database,
												arrays[j]
											);
										}
									}

									if (data.indexName) {
										const transaction =
											event.target.transaction;
										const objectStore =
											transaction.objectStore(arrays[j]);
										if (
											!objectStore.indexNames.contains(
												data.indexName
											)
										)
											objectStore.createIndex(
												data.indexName,
												data.indexFields,
												{ unique: data.unique || false }
											);
									}
								}
							};

							request.onsuccess = function (event) {
								if (databases.length - 1 === i) {
									if (data.method == "database.get")
										resolve(event.target.result);
									else resolve(data);
								}
							};

							request.onerror = function (event) {
								errorHandler(
									data,
									event.target.error,
									database,
									array
								);
								if (databases.length - 1 === i) {
									if (data.method == "database.get")
										resolve(event.target.result);
									else resolve(data);
								}
							};
						} else if (databases.length - 1 === i) {
							if (data.method == "database.get") resolve(db);
							else resolve(data);
						}
					};

					openRequest.onerror = function () {
						errorHandler(data, openRequest.error, database);
						resolve(data);
					};
				}
			}
		},
		(error) => {
			errorHandler(data, error);
		}
	);
};

async function processArray(data, newData, database, type) {
	let db = await processDatabase({ method: "database.get", database });

	let objectStoreNames = Array.from(db.objectStoreNames);
	if (data.method == "array.read") {
		if (!data[type]) data[type] = [];

		for (let i = 0; i < objectStoreNames.length; i++) {
			if (data.$filter && data.$filter.query) {
				let isFilter = queryData(
					{ name: objectStoreNames[i] },
					data.$filter.query
				);
				if (isFilter)
					newData.push({
						name: objectStoreNames,
						$storage: ["indexeddb"],
						$database: [database]
					});
			} else
				newData.push({
					name: objectStoreNames[i],
					$storage: ["indexeddb"],
					$database: [database]
				});
		}
	} else {
		db.close();

		let request = await processDatabase({
			method: "database.get",
			database,
			upgrade: true
		});
		await new Promise((resolve) => {
			request.onupgradeneeded = function (event) {
				let db = event.target.result;
				let arrays;
				if (data.method == "array.update")
					arrays = Object.keys(data[type]);
				else arrays = data[type];
				if (!Array.isArray(arrays)) arrays = [arrays];

				for (let i = 0; i < arrays.length; i++) {
					let error,
						array = arrays[i];

					let arrayExist = db.objectStoreNames.contains(array);
					if (arrayExist && data.method == "array.create") {
						error = "array already exists";
					} else if (data.method == "array.delete") {
						if (objectStoreNames.includes(array)) {
							db.deleteObjectStore(array);
						} else {
							error = "the array does not exist";
						}
					} else {
						if (!arrayExist && data.method == "array.update")
							array = data[type][arrays[i]];

						if (arrayExist) {
							if (data.method == "array.update") {
								let transaction = event.target.transaction;
								let objectStore =
									transaction.objectStore(array);

								if (
									!objectStoreNames.includes(
										data[type][arrays[i]]
									)
								)
									array = objectStore.name =
										data[type][arrays[i]];
								else
									error =
										"An array with the new name already exist";
							}
						} else if (data.method == "array.update")
							error = "array does not exists";
					}

					if (!error)
						newData.push({
							name: array,
							$storage: ["indexeddb"],
							$database: [database]
						});
					else errorHandler(data, error, database);
				}
			};

			request.onsuccess = function (event) {
				event.target.result.close();
				resolve();
			};

			request.onerror = function (event) {
				errorHandler(data, event.target.error, database);
				resolve();
			};
		});
	}
}

async function processIndex(data, newData, database, array, type) {
	let db = await processDatabase({ method: "database.get", database });
	let arrayExist = db.objectStoreNames.contains(array);
	if (arrayExist) {
		// ToDO: switch here to types
		let transaction = db.transaction(array, "readonly");
		let objectStore = transaction.objectStore(array);
		let indexNames = Array.from(objectStore.indexNames);

		if (data.method == "index.read") {
			for (let i = 0; i < indexNames.length; i++) {
				let name = indexNames[i];
				if (data.$filter && data.$filter.query)
					if (!queryData({ name }, data.$filter.query)) continue;

				newData.push({
					name,
					$storage: ["indexeddb"],
					$database: [database],
					$array: [array]
				});
			}
			db.close();
		} else {
			db.close();
			let indexes;
			if (data.method == "index.update")
				indexes = Object.keys(data[type]);
			else indexes = data[type];

			if (!Array.isArray(indexes)) indexes = [indexes];

			for (let i = 0; i < indexes.length; i++) {
				let error,
					index = indexes[i];
				db = await processDatabase({
					method: "database.get",
					database,
					upgrade: true
				});
				let transaction = db.transaction;
				let objectStore = transaction.objectStore(array);
				let indexExist = indexNames.includes(index);

				if (data.method == "index.create") {
					if (!indexExist)
						objectStore.createIndex(index, index, {
							unique: false
						});
					else error = "index already exist";
				} else if (indexExist) {
					if (data.method == "index.delete")
						objectStore.deleteIndex(index);
					else if (
						data.method == "index.update" &&
						!indexNames.includes(data[type][indexes[i]])
					) {
						if (!indexNames.includes(data[type][indexes[i]])) {
							let indexObj = objectStore.index(index);
							index = indexObj.name = data[type][indexes[i]];
						} else error = "new index name already exist";
					}
				} else error = "index does not exist";

				if (!error)
					newData.push({
						name: index,
						$storage: ["indexeddb"],
						$database: [database],
						$array: [array]
					});
				else errorHandler(data, error, database, array);

				db.result.close();
			}
		}
	}
}

async function processObject(data, newData, database, array, type) {
	let db = await processDatabase({ method: "database.get", database });

	try {
		if (!data[type]) data[type] = [];
		else if (typeof data[type] === "string")
			data[type] = [{ _id: data[type] }];
		else if (!Array.isArray(data[type])) data[type] = [data[type]];

		let isFilter;
		if (data.$filter) isFilter = true;

		let arrayExist = db.objectStoreNames.contains(array);
		if (!arrayExist) {
			db.close();
			if (
				data.method == "object.create" ||
				data.method == "object.update"
			) {
				db = await processDatabase({
					method: "database.get",
					database,
					array
				});
			} else {
				return errorHandler(
					data,
					"array does not exist",
					database,
					array
				);
			}
		}

		if (!array || !db)
			throw new Error({ error: "This is an error message.", db, array });

		let lastItem;
		if ((isFilter && !data[type].length) || data.isFilter) {
			if (data[type].length) lastItem = data[type][data[type].length - 1];
			data[type] = [{ isFilter: "isEmptyObjectFilter" }];

			// data[type].splice(0, 0, { isFilter: 'isEmptyObjectFilter' });
		}

		let transactionType = "readwrite";
		if (data.method == "object.read") transactionType = "readonly";

		let transaction = db.transaction([array], transactionType);
		let objectStore = transaction.objectStore(array);

		let globalOperators = getGlobalOperators(data);
		let upsert = data.upsert;

		for (let i = 0; i < data[type].length; i++) {
			const reference = {
				$storage: ["indexeddb"],
				$database: [database],
				$array: [array]
			};

			delete data[type][i].$storage;
			delete data[type][i].$database;
			delete data[type][i].$array;

			if (data.method == "object.create") {
				if (data.organization_id)
					data[type][i]["organization_id"] = data.organization_id;

				if (!data[type][i]._id)
					data[type][i]["_id"] = ObjectId().toString();
				data[type][i] = dotNotationToObject(data[type][i]);

				// TODO: user_id || clientId shohould be retrieved from CoCreate
				data[type][i]["created"] = {
					on: data.timeStamp,
					by: data.user_id || data.clientId
				};
				data[type][i] = await add(objectStore, data[type][i]);
				data[type][i] = { ...reference, ...data[type][i] };
			} else {
				if (data[type][i].$filter) isFilter = true;

				if (data.method == "object.update") {
					if (data.organization_id)
						data[type][i]["organization_id"] = data.organization_id;

					if (data[type][i].$upsert) upsert = data[type][i].$upsert;
					// TODO: user_id || clientId shohould be retrieved from CoCreate
					if (!data[type][i].modified)
						data[type][i].modified = {
							on: data.timeStamp,
							by: data.user_id || data.clientId
						};
				}

				let index = 0,
					limit,
					range,
					direction;
				if (data[type][i]._id) {
					range = IDBKeyRange.only(data[type][i]._id);
				} else if (isFilter) {
					let indexName;
					let indexFields;

					if (data.$filter) {
						// TODO: requires a more robust sorting thats suports various directions
						// Build compound index name from sort keys
						if (data.$filter.sort && data.$filter.sort.length > 0) {
							// Create a standard index name without _id
							let sortKeys = data.$filter.sort
								.map((sort) => sort.key)
								.filter((key) => key !== "_id");
							indexName = sortKeys.join("_"); // e.g., "createdAt_category"

							// Define compound index fields
							indexFields = [...sortKeys];

							// Set cursor direction based on the first sort key direction
							direction =
								data.$filter.sort[0].direction === "desc"
									? "prev"
									: "next";

							// Use last item's values, including _id, to set up the range for pagination
							if (indexName && lastItem && lastItem._id) {
								indexName += "_id";
								indexFields.push("_id");
								let lastKeyValues = [
									...sortKeys.map((key) => lastItem[key]),
									lastItem._id
								]; // Compound key array with _id

								// Create IDBKeyRange based on direction and lastKeyValues
								if (direction === "next") {
									range = IDBKeyRange.lowerBound(
										lastKeyValues,
										true
									);
								} else {
									range = IDBKeyRange.upperBound(
										lastKeyValues,
										true
									);
								}
							}
						} else if (
							data.$filter.query &&
							data.$filter.query[0] &&
							data.$filter.query[0].key
						) {
							if (data.$filter.query[0].operator === "$eq") {
								range = IDBKeyRange.only(
									data.$filter.query[0].value
								);
							} else if (
								data.$filter.query[0].operator === "$gt"
							) {
								range = IDBKeyRange.lowerBound(
									data.$filter.query[0].value,
									true
								);
							} else if (
								data.$filter.query[0].operator === "$lt"
							) {
								range = IDBKeyRange.upperBound(
									data.$filter.query[0].value,
									true
								);
							} else if (
								data.$filter.query[0].operator === "$gte"
							) {
								range = IDBKeyRange.lowerBound(
									data.$filter.query[0].value
								);
							} else if (
								data.$filter.query[0].operator === "$lte"
							) {
								range = IDBKeyRange.upperBound(
									data.$filter.query[0].value
								);
							}

							indexName = data.$filter.query[0].key;
						}
					}

					if (indexName && !indexName.includes("-")) {
						// Check if the compound index exists; create it if not
						let indexNames = Array.from(objectStore.indexNames);
						if (!indexNames.includes(indexName)) {
							db.close();
							db = await processDatabase({
								method: "database.get",
								database,
								array,
								indexName,
								indexFields
							});
							transaction = db.transaction(array, "readwrite");
							objectStore = transaction.objectStore(array);
						}
						objectStore = objectStore.index(indexName);
					}

					let count = objectStore.count();
					count.onsuccess = function () {
						if (data.$filter) data.$filter.count = count.result;
						else if (data.object.$filter)
							data.object.$filter.count = count.result;
					};

					if (data.$filter) {
						if (data.$filter.index) index = data.$filter.index;
						if (data.$filter.limit) limit = data.$filter.limit;
					}

					if (data[type][i].$filter) {
						if (data[type][i].$filter.index)
							index = data[type][i].$filter.index;
						if (data[type][i].$filter.limit)
							limit = data[type][i].$filter.limit;
					}
				} else if (
					data.method == "object.delete" ||
					(data.method == "object.update" &&
						!range &&
						!upsert &&
						!isFilter)
				) {
					continue;
				}

				await openCursor(
					objectStore,
					range,
					direction,
					data,
					newData,
					isFilter,
					index,
					limit,
					database,
					array,
					upsert,
					type,
					i,
					globalOperators,
					reference
				);

				if (index) newData = newData.slice(index);
			}
		}

		if (db.close) db.close();
	} catch (error) {
		errorHandler(data, error, database, array);
		if (db.close) db.close();
	}
}

function openCursor(
	objectStore,
	range,
	direction,
	data,
	newData,
	isFilter,
	index,
	limit,
	database,
	array,
	upsert,
	type,
	i,
	globalOperators,
	reference
) {
	return new Promise(async (resolve, reject) => {
		const request = objectStore.openCursor(range || null, direction); // next, prev

		let hasUpdated,
			matchedLength = 0,
			hasSkipped;
		request.onsuccess = async () => {
			let cursor = request.result;

			if (
				data.method === "object.create" ||
				(data.method === "object.update" &&
					((!range && !isFilter && upsert) ||
						(!cursor && upsert && !hasUpdated)))
			) {
				let isMatch = true;
				if (isFilter) {
					if (cursor)
						isMatch = filter(
							objectStore,
							data[type][i],
							data[type][i],
							cursor.value
						);
					else if (data.method === "object.update" && !upsert)
						isMatch = false;
				}

				if (isMatch !== false) {
					try {
						data[type][i]._id = ObjectId(
							data[type][i]._id
						).toString();
					} catch (error) {
						data[type][i]._id = ObjectId().toString();
					}

					let result;
					if (data.method == "object.create") {
						data[type][i] = await add(objectStore, data[type][i]);
					} else if (data.method == "object.update") {
						let update = createUpdate(
							cursor && cursor.value ? cursor.value : {},
							data[type][i],
							globalOperators
						);
						if (update) {
							await put(objectStore, update);
							data[type][i].$update = update;
						}
					}
					data[type][i] = { ...reference, ...data[type][i] };

					matchedLength++;
				}
				resolve();
			} else if (cursor) {
				if (index && !hasSkipped) {
					cursor.advance(index);
					hasSkipped = true;
				} else {
					let isMatch = true;
					if (isFilter)
						isMatch = filter(
							objectStore,
							data,
							data[type][i],
							cursor.value
						);

					if (isMatch !== false) {
						let result = cursor.value;

						if (data.method == "object.update") {
							let update = createUpdate(
								cursor.value,
								data[type][i],
								globalOperators
							);
							if (update) await cursorUpdate(cursor, update);
							result = data[type][i];
							result.$update = update;
							// result = cursor.update(update)
							hasUpdated = true;
							// set dotnotation for keys with $operators for items that end in [] to be used by socket.id
							// TODO: if update.$<operator>.someKey[] requires the index of inerted item added to the field name. update.$<operator>.someKey[<index>]
							// TODO: if $addToSet get field name and item if it does not exist.
							// TODO: if $pull get field name and find if item exist and delete.
						} else if (data.method == "object.delete") {
							result = cursor.value;
							cursor.delete();
						}

						if (data[type][i]._id)
							data[type][i] = { ...reference, ...result };
						else {
							let object = data[type].find(
								(obj) => obj._id && obj._id === result._id
							);
							if (object)
								object = { ...reference, ...object, ...result };
							else newData.push({ ...reference, ...result });
						}
					}

					if (
						!limit ||
						(limit && limit > newData.length + matchedLength)
					) {
						cursor.continue();
					} else {
						resolve();
					}
				}
			} else {
				resolve();
			}
		};

		request.onerror = () => {
			reject(request.error);
		};
	});
}

function add(objectStore, object) {
	return new Promise((resolve, reject) => {
		const store = objectStore.objectStore || objectStore;
		let request = store.add(object);
		request.onsuccess = () => resolve(object);
		request.onerror = () => reject(request.error);
	});
}

function get(objectStore, object) {
	return new Promise((resolve, reject) => {
		const request = objectStore.get(object._id);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function put(objectStore, object) {
	return new Promise((resolve, reject) => {
		const store = objectStore.objectStore || objectStore;
		let request = store.put(object);

		request.onsuccess = () => resolve(object);
		request.onerror = () => reject(request.error);
	});
}

function deleteObject(objectStore, object) {
	return new Promise((resolve, reject) => {
		const request = objectStore.delete(object._id);
		request.onsuccess = () => resolve(object);
		request.onerror = () => reject(request.error);
	});
}

function cursorUpdate(cursor, update) {
	return new Promise((resolve, reject) => {
		const request = cursor.update(update);
		request.onsuccess = () => resolve(request.source.value);
		request.onerror = () => reject(request.error);
	});
}

function filter(objectStore, data, object, result) {
	let isMatch = true;
	let filter = data.$filter || object.$filter;
	if (filter) {
		if (filter.query) isMatch = queryData(result, filter.query);
		if (isMatch && filter.search)
			isMatch = searchData(result, filter.search);
	}

	return isMatch;
}

function getGlobalOperators(data, object = {}) {
	for (let operator of Object.keys(data)) {
		if (!operator.startsWith("$")) return;
		for (let key of Object.keys(data[operator]))
			object[operator + "." + key] = data[operator][key];
	}

	return object;
}

function createData(data, newData, type) {
	// data.request = data[type] || {}
	if (
		data[type] &&
		data[type][0] &&
		data[type][0].isFilter === "isEmptyObjectFilter"
	) {
		data[type].shift();
		data.isFilter = true;
	}

	data[type].push(...newData);

	if (data.$filter) {
		if (data.$filter.sort)
			data[type] = sortData(data[type], data.$filter.sort);

		data.$filter.startingIndex = data.$filter.index;
		data.$filter.index += data[type].length;
	}

	return data;
}

function errorHandler(data, error, database, array) {
	console.error(error, data);
	// if (typeof error == "object") error["storage"] = "indexeddb";
	// else error = { storage: "indexeddb", message: error };

	// if (database) error["database"] = database;
	// if (array) error["array"] = array;
	// if (data.error) data.error.push(error);
	// else data.error = [error];
}

init();

export default { send, ObjectId };
