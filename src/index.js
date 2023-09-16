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

// Commercial Licensing Information:
// For commercial use of this software without the copyleft provisions of the AGPLv3,
// you must obtain a commercial license from CoCreate LLC.
// For details, visit <https://cocreate.app/licenses/> or contact us at sales@cocreate.app.

import { ObjectId, dotNotationToObject, searchData, sortData, queryData } from '@cocreate/utils'

// let status = true;
let indexedDbFunction
function init() {
    // Check for support.
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        setStatus(false);
        return;
    } else {
        try {
            indexedDB.databases()
            if (window.CoCreateConfig && window.CoCreateConfig.indexeddb !== false)
                setStatus(true)
        } catch (e) {
            setStatus(false);
        }
    }
}

function setStatus(value) {
    if (window.CoCreateConfig)
        window.CoCreateConfig.indexeddb = value;
    else
        window.CoCreateConfig = { indexeddb: value };

    if (!value) {
        indexedDbFunction = indexedDb
        send = value;
    } else if (!send) {
        send = indexedDbFunction
        indexedDbFunction = true
    }
}

async function send(data) {
    try {
        let newData = [];

        let type = data.method.split('.');
        type = type[type.length - 1];

        if (type === 'database') {
            if (data.method === 'get.database') {
                return await processDatabase(data)
            } else
                await processDatabase(data, newData, type)
        } else {
            if (data.request)
                data[type] = data.request

            if (!data['timeStamp'])
                data['timeStamp'] = new Date().toISOString()

            let databases = data.database;
            if (!Array.isArray(databases))
                databases = [databases]

            let arrays = data.array;
            if (!Array.isArray(arrays))
                arrays = [arrays]

            for (let i = 0; i < databases.length; i++) {
                let database = databases[i]
                if (type === 'array') {
                    await processArray(data, newData, database, '', type)
                } else {
                    for (let j = 0; j < arrays.length; j++) {
                        if (type === 'index')
                            await processIndex(data, newData, database, type)
                        else if (type === 'object')
                            await processObject(data, newData, database, arrays[j], type)
                    }
                }
            }
        }
        return createData(data, newData, type)

    } catch (error) {
        errorHandler(data, error)
    }
}

const dbVersion = new Map()
const processDatabase = (data, newData, type) => {
    return new Promise((resolve, reject) => {
        if (!data)
            data = {}
        if (data.request)
            data[type] = data.request

        if (!data['timeStamp'])
            data['timeStamp'] = new Date().toISOString()

        if (data.method == 'read.database') {
            indexedDB.databases().then((databases) => {
                for (let database of databases) {
                    if (data.$filter && data.$filter.query) {
                        let isFilter = queryData(database, data.$filter.query)
                        if (isFilter)
                            newData.push({ $storage: 'indexeddb', $database: database })
                    } else
                        newData.push({ $storage: 'indexeddb', $database: database })
                }

                resolve()
            })
        } else {
            let databases
            if (data.method == 'update.database')
                databases = Object.keys(data.database)
            else
                databases = data.database;

            if (!Array.isArray(databases))
                databases = [databases]

            for (let i = 0; i < databases.length; i++) {
                let openRequest, database = databases[i];
                switch (data.method) {
                    case 'get.database':
                    case 'create.database':
                    case 'update.database':
                        openRequest = indexedDB.open(database);
                        break;
                    case 'delete.database':
                        openRequest = indexedDB.deleteprocessDatabase(database);
                        break;
                    default:
                        errorHandler(data, 'unknown method', database)
                        resolve(data)
                }

                openRequest.onsuccess = function () {
                    let db = openRequest.result;
                    let dbs = [] // TODO: return an array of dbinstance??
                    if (data.method == 'update.database') {
                        // TODO: open a cursor at database array and save each array and object at value

                        let objectStoreNames = Array.from(db.objectStoreNames)
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
                                errorHandler(data, request.error, database, array)
                            };

                        }

                    } else if (data.array && data.array.length) {
                        let arrays = data.array;
                        if (!Array.isArray(arrays))
                            arrays = [arrays]

                        for (let j = 0; j < arrays.length; j++) {
                            let array = arrays[j]
                            let arrayExist = db.objectStoreNames.contains(array)
                            if (!arrayExist || arrays.length == 1 && data.upgrade == true) {
                                db.close()

                                let version = dbVersion.get(database) || openRequest.result.version
                                let request = indexedDB.open(database, Number(version += 1));
                                dbVersion.set(database, version)

                                request.onupgradeneeded = function () {
                                    db = request.result;

                                    if (!arrayExist) {
                                        db = request.result;
                                        try {
                                            db.createObjectStore(array, { keyPath: '_id', autoIncrement: true });
                                        } catch (error) {
                                            errorHandler(data, error, database, array)
                                        }
                                    }
                                };

                                request.onsuccess = function () {
                                    if (databases.length - 1 === i && arrays.length - 1 === j) {
                                        if (data.method == 'get.database') {
                                            let transaction = request.transaction

                                            if (data.upgrade == true && !transaction) {
                                                request.result.close()

                                                let version = dbVersion.get(database) || openRequest.result.version
                                                let upgrade = indexedDB.open(database, Number(version += 1));
                                                dbVersion.set(database, version)

                                                upgrade.onupgradeneeded = function () {
                                                    resolve(upgrade)
                                                };

                                            } else {
                                                resolve(request.result)
                                            }
                                        }
                                        else
                                            resolve(data)
                                    }
                                };

                                request.onerror = function () {
                                    errorHandler(data, request.error, database, array)
                                    if (databases.length - 1 === i && arrays.length - 1 === j) {
                                        if (data.method == 'get.database')
                                            resolve(request)
                                        else
                                            resolve(data)
                                    }
                                };
                            } else {
                                if (databases.length - 1 === i && arrays.length - 1 === j) {
                                    if (data.method == 'get.database')
                                        resolve(db)
                                    else
                                        resolve(data)
                                }
                            }
                        }
                    } else {
                        if (databases.length - 1 === i) {
                            if (data.method == 'get.database') {
                                let transaction = openRequest.transaction

                                if (data.upgrade == true && !transaction) {
                                    db.close()

                                    let version = dbVersion.get(database) || openRequest.result.version
                                    let upgrade = indexedDB.open(database, Number(version += 1));
                                    dbVersion.set(database, version)

                                    upgrade.onupgradeneeded = function () {
                                        resolve(upgrade)
                                    };
                                } else
                                    resolve(db)
                            } else
                                resolve(data)
                        }
                    }

                }

                openRequest.onerror = function () {
                    errorHandler(data, openRequest.error, database)
                    resolve(data)
                };

            }
        }

    }, (error) => {
        errorHandler(data, error)
    });
}

async function processArray(data, newData, database, type) {
    let db = await processDatabase({ method: 'get.database', database })
    db.close()

    let objectStoreNames = Array.from(db.objectStoreNames)
    if (data.method == 'read.array') {
        if (!data[type])
            data[type] = []

        for (let i = 0; i < objectStoreNames.length; i++) {
            if (data.$filter && data.$filter.query) {
                let isFilter = queryData({ name: objectStoreNames[i] }, data.$filter.query)
                if (isFilter)
                    newData.push({ name: objectStoreNames, $storage: 'indexeddb', $database: database })
            } else
                newData.push({ name: objectStoreNames[i], $storage: 'indexeddb', $database: database })
        }
    } else {
        let arrays
        if (data.method == 'update.array')
            arrays = Object.keys(data[type])
        else
            arrays = data[type];
        if (!Array.isArray(arrays))
            arrays = [arrays]

        for (let i = 0; i < arrays.length; i++) {
            let error, array = arrays[i]

            let arrayExist = db.objectStoreNames.contains(array)
            if (arrayExist && data.method == 'create.array') {
                error = 'array already exists'
            } else {
                if (!arrayExist && data.method == 'update.array')
                    array = data[type][arrays[i]]

                let db = await processDatabase({ method: 'get.database', database, array, upgrade: true })
                if (arrayExist) {
                    if (data.method == 'delete.array')
                        db.result.deleteObjectStore(array)
                    else if (data.method == 'update.array') {
                        let transaction = db.transaction;
                        let objectStore = transaction.objectStore(array);

                        if (!objectStoreNames.includes(data[type][arrays[i]]))
                            array = objectStore.name = data[type][arrays[i]];
                        else
                            error = 'An array with the new name already exist'
                    }
                } else if (data.method == 'update.array')
                    error = 'array does not exists'
            }

            db.result.close()

            if (!error)
                newData.push({ name: array, $storage: 'indexeddb', $database: database })
            else
                errorHandler(data, error, database)
        }
    }
}

async function processIndex(data, newData, database, array, type) {
    let db = await processDatabase({ method: 'get.database', database })
    let arrayExist = db.objectStoreNames.contains(array)
    if (arrayExist) {
        // ToDO: switch here to types
        let transaction = db.transaction(array, "readonly");
        let objectStore = transaction.objectStore(array);
        let indexNames = Array.from(objectStore.indexNames)

        if (data.method == 'read.index') {
            for (let i = 0; i < indexNames.length; i++) {
                let name = indexNames[i]
                if (data.$filter && data.$filter.query)
                    if (!(queryData({ name }, data.$filter.query))) continue

                newData.push({ name, $storage: 'indexeddb', $database: database, $array: array })
            }
            db.close()
        } else {
            db.close()
            let indexes
            if (data.method == 'update.index')
                indexes = Object.keys(data[type])
            else
                indexes = data[type];

            if (!Array.isArray(indexes))
                indexes = [indexes]

            for (let i = 0; i < indexes.length; i++) {
                let error, index = indexes[i]
                db = await processDatabase({ method: 'get.database', database, upgrade: true })
                let transaction = db.transaction;
                let objectStore = transaction.objectStore(array);
                let indexExist = indexNames.includes(index)

                if (data.method == 'create.index') {
                    if (!indexExist)
                        objectStore.createIndex(index, index, { unique: false })
                    else
                        error = 'index already exist'
                } else if (indexExist) {
                    if (data.method == 'delete.index')
                        objectStore.deleteIndex(index)
                    else if (data.method == 'update.index' && !indexNames.includes(data[type][indexes[i]])) {
                        if (!indexNames.includes(data[type][indexes[i]])) {
                            let indexObj = objectStore.index(index);
                            index = indexObj.name = data[type][indexes[i]];
                        } else
                            error = 'new index name already exist'
                    }
                } else
                    error = 'index does not exist'

                if (!error)
                    newData.push({ name: index, $storage: 'indexeddb', $database: database, $array: array })
                else
                    errorHandler(data, error, database, array)

                db.result.close()
            }
        }
    }
}

async function processObject(data, newData, database, array, type) {
    let db = await processDatabase({ method: 'get.database', database })

    let isFilter
    if (data.$filter && data.$filter.query)
        isFilter = true

    let arrayExist = db.objectStoreNames.contains(array)
    if (!arrayExist) {
        if (data.$filter || data.method == 'read.object' && (!data.object || data.object && !data.object.length)) {
            db.close()
            db = await processDatabase({ method: 'get.database', database, array })
        }
    }

    if (!array || !db)
        throw new Error({ error: "This is an error message.", db, array });

    let transactionType = "readwrite"
    if (data.method == 'read.object')
        transactionType = "readonly"

    let transaction = db.transaction([array], transactionType);
    let objectStore = transaction.objectStore(array);

    if (data[type] && !Array.isArray(data[type]))
        data[type] = [data[type]]

    if (isFilter && (!data[type] || !data[type].length))
        data[type] = [{}]

    let upsert = data.upsert
    try {

        for (let i = 0; i < data[type].length; i++) {
            delete data[type][i].$storage
            delete data[type][i].$database
            delete data[type][i].$array

            if (data.method == 'create.object') {
                if (!data[type][i]._id)
                    data[type][i]['_id'] = ObjectId()
                data[type][i] = dotNotationToObject(data[type][i])
                data[type][i]['created'] = { on: data.timeStamp, by: data.user_id || data.clientId }

                let result = await add(objectStore, data[type][i])
                newData.push({ $storage: 'indexeddb', $database: database, $array: array, ...result })
            } else {
                if (data[type][i].$filter)
                    isFilter = true
                if (data.organization_id)
                    data[type][i]['organization_id'] = data.organization_id

                if (data.method == 'update.object') {
                    if (data[type][i].$upsert)
                        upsert = data[type][i].$upsert

                    if (!data[type][i]._id && upsert)
                        data[type][i]._id = ObjectId()
                    data[type][i]['modified'] = { on: data.timeStamp, by: data.user_id || data.clientId }
                }

                let index = 0, limit, range, direction
                if (data[type][i]._id)
                    range = IDBKeyRange.only(data[type][i]._id);
                else if (isFilter) {
                    if (data.$filter || object.$filter) {
                        let count = objectStore.count();
                        count.onsuccess = function () {
                            data.$filter.count = count.result
                        }
                    }

                    let isIndex = false
                    let indexName, direction;
                    if (data.$filter && data.$filter.sort && data.$filter.sort[0] && data.$filter.sort[0].name) {
                        indexName = data.$filter.sort[0].name
                        // if (indexName.includes('-'))
                        //     isIndex = false
                        // else
                        // isIndex = true
                    }

                    if (isIndex) {
                        direction = data.$filter.sort[0].direction
                        if (direction == 'desc')
                            direction = 'prev'
                        else
                            direction = 'next'

                        let indexNames = Array.from(objectStore.indexNames)
                        let indexExist = indexNames.includes(indexName)
                        if (!indexExist) {
                            db.close()
                            db = await processDatabase({ method: 'get.database', database, upgrade: true })
                            transaction = db.transaction([array], 'readwrite');
                            objectStore = transaction.objectStore(array);
                            try {
                                objectStore.createIndex(indexName, indexName, { unique: false })
                            } catch (error) {
                                // console.log(error)
                            }
                        }
                        objectStore = objectStore.index(indexName);
                    }

                    if (data.$filter) {
                        if (data.$filter.index)
                            index = data.$filter.index
                        if (data.$filter.limit)
                            limit = data.$filter.limit
                        if (limit)
                            limit = index + limit;
                    }
                }

                let cursor = await openCursor(objectStore, range, direction)
                if (cursor) {
                    let isMatch = true

                    if (isFilter)
                        isMatch = filter(objectStore, data[type][i], cursor.value)

                    if (isMatch !== false) {
                        let result
                        if (data.method == 'create.object') {
                            result = await add(objectStore, data[type][i])
                        } else if (data.method == 'read.object') {
                            result = await get(objectStore, data[type][i])
                        } else if (data.method == 'update.object') {
                            data[type][i] = dotNotationToObject(data[type][i], cursor.value)
                            data[type][i] = createUpdate(data, data[type][i])
                            result = await put(objectStore, data[type][i])
                        } else if (data.method == 'delete.object') {
                            result = await deleteObject(objectStore, data[type][i])
                        }

                        newData.push({ $storage: 'indexeddb', $database: database, $array: array, ...result })
                    }

                    limit && limit == newData.length ? '' : cursor.continue();

                } else if (index)
                    newData = newData.slice(index)
            }
        }
    } catch (error) {
        errorHandler(data, error, database, array)
    }

    db.close()
}

function openCursor(objectStore, range, direction) {
    return new Promise(async (resolve, reject) => {
        const request = objectStore.openCursor(range, direction);// next, prev
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error)
    });
}

function add(objectStore, object) {
    return new Promise((resolve, reject) => {
        const request = objectStore.add(object);
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
        const request = objectStore.put(object);
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


function createUpdate(data, object) {
    if (data.updateName) {
        for (let key of Object.keys(data.updateName)) {
            let val = object[key]
            delete object[key]
            object[data.updateName[key]] = val
        }
    }

    if (data.deleteName) {
        for (let key of Object.keys(data.deleteName)) {
            delete object[key]
        }

    }
    return object
}

function filter(data, object, result) {
    let isMatch = true;

    if (data.$filter || object.$filter) {
        let count = objectStore.count();
        count.onsuccess = function () {
            data.$filter.count = count.result
        }
    }

    if (data.$filter) {
        if (data.$filter.query)
            isMatch = queryData(result, data.$filter.query);
        if (isMatch && data.$filter.search)
            isMatch = searchData(result, data.$filter.search);
    }

    let modify = true
    if (result && object.modified && result.modified)
        if (object.modified.on < result.modified.on)
            modify = false

    return isMatch
}

function createData(data, newData, type) {
    data.request = data[type] || {}

    if (data.$filter && data.$filter.sort)
        data[type] = sortData(newData, data.$filter.sort)
    else
        data[type] = newData

    if (data.returnLog) {
        if (!data.log)
            data.log = []
        data.log.push(...data[type])
    }

    return data
}

function errorHandler(data, error, database, array) {
    if (typeof error == 'object')
        error['storage'] = 'indexeddb'
    else
        error = { storage: 'indexeddb', message: error }

    if (database)
        error['database'] = database
    if (array)
        error['array'] = array
    if (data.error)
        data.error.push(error)
    else
        data.error = [error]
}

init();

export default { send }