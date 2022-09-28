/********************************************************************************
 * Copyright (C) 2020 CoCreate LLC and others.
 *
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/
import {dotNotationToObject} from '@cocreate/utils'
import {searchData, sortData, queryData} from '@cocreate/filter/src/filter.js'

const createDatabase = (data) => {
    return new Promise((resolve, reject) => {
        
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            resolve(openRequest.result)
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const readDatabase = (data) => {
    return new Promise((resolve, reject) => {

        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            if (data.upgrade == true) { 
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result
                };
        
                request.onsuccess = function() {
                    resolve(db)
                };
            
                request.onerror = function() {
                    reject(request.error)
                };
        
            } else {
                resolve(db)
            }
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const readDatabases = () => {
    return new Promise((resolve, reject) => {
        indexedDB.databases().then((databases) => {
            resolve(databases)
        })
    }, (err) => {
        console.log(err);
    });
}

const updateDatabase = (data) => {
    return new Promise((resolve, reject) => {
        
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            if (data.newDatabase) { 
                // function to clone db with new name
            } else {
                resolve(db)
            }
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const deleteDatabase = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.deleteDatabase(data.database);

        openRequest.onsuccess = function() {
            resolve(openRequest.result);
        };

        openRequest.onerror = function() {
            reject(openRequest.error);
        };

    }, (err) => {
        console.log(err);
    });
}

const database = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let collectionExist = db.objectStoreNames.contains(data.collection)
            if (data.collection && !collectionExist || data.upgrade == true) { 
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    if (!collectionExist) {
                        db = request.result;
                        db.createObjectStore(data.collection, {keyPath: '_id', autoIncrement: true});
                    }
                };
        
                request.onsuccess = function() {
                    resolve(db)
                };
            
                request.onerror = function() {
                    reject(request.error)
                };
        
            } else {
                resolve(db)
            }
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}


const createCollection = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            if (!db.objectStoreNames.contains(data.collection)) { 
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result;
                    db.createObjectStore(data.collection, {keyPath: '_id', autoIncrement: true});
                };
        
                request.onsuccess = function() {
                    resolve(request.result)
                };
            
                request.onerror = function() {
                    console.log("Error", request.error);
                    reject(request.error)
                };
        
            } else {
                resolve(db)
            }
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const readCollections = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let collections = db.objectStoreNames
            data.data = [];
            
            for (let collection of Array.from(collections)){
                data.data.push({name: collection})
            }

            data.collection = 'collections'
            resolve(data)
        }

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const updateCollection = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.dastabase);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            if (db.objectStoreNames.contains(data.collection)) { 
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.dastabase, Number(version += 1));
                request.onupgradeneeded = function() {
                    let db = request.result;
                    let transaction = db.transaction([data.collection], "readonly");
                    let collection = transaction.objectStore(data.collection);
                    collection.name = data.newCollection
                }

                request.onsuccess = function() {
                    db.close()
                    resolve(request.result)
                };
            
                request.onerror = function() {
                    reject(request.error)
                };
                
            } else {
                db.createObjectStore(data.newCollection, {keyPath: '_id', autoIncrement: true})
                resolve(data.newCollection)
            }
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const deleteCollection = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            if (db.objectStoreNames.contains(data.collection)) { 
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result;
                    db.deleteObjectStore(data.collection)
                }

                request.onsuccess = function() {
                    // let db = request.result;
                    db.close()
                    resolve(data.collection)
                };
            
                request.onerror = function() {
                    reject(request.error)
                };
                
            };
        };
    
        openRequest.onerror = function() {
            reject(openRequest.error)
        };

    }, (err) => {
        console.log(err);
    });
}

const createIndex = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readonly");
            let collection = transaction.objectStore(data.collection);
            
            if (!collection.indexNames.contains(data.name)){
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result;
                    transaction = db.transaction([data.collection], "readonly");
                    collection = transaction.objectStore(data.collection);
                    collection.createIndex(data.name, data.name, {unique: false})
                }

                request.onsuccess = function() {
                    db.close()
                    resolve('index created')
                };

                request.onerror = function() {
                    reject(request.error)
                };
    
            } else {
                resolve('index created')
            }
        };
            
        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })


}
const readIndex = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readonly");
            let collection = transaction.objectStore(data.collection); 
            let indexes = collection.indexNames
            db.close()
            resolve(indexes)
        };
            
        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })

}

const updateIndex = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readonly");
            let collection = transaction.objectStore(data.collection);
            
            if (collection.indexNames.contains(data.oldName)){
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result;
                    transaction = db.transaction([data.collection], "readonly");
                    collection = transaction.objectStore(data.collection);
                    let index = store.index(data.oldName);
                    index.name = data.newName;
                }

                request.onsuccess = function() {
                    let db = request.result;
                    db.close()
                    resolve('index does not exist')
                };

                request.onerror = function() {
                    reject(request.error)
                };
    
            } else {
                collection.createIndex(data.newName, data.newName, {unique: false})
                db.close()
                resolve('index does not exist')
            }
        };
            
        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })

}
const deleteIndex = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);

        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readonly");
            let collection = transaction.objectStore(data.collection);
            
            if (collection.indexNames.contains(data.name)){
                let version = openRequest.result.version
                db.close()
                
                let request = indexedDB.open(data.database, Number(version += 1));
                request.onupgradeneeded = function() {
                    db = request.result;
                    transaction = db.transaction([data.collection], "readonly");
                    collection = transaction.objectStore(data.collection);
                    collection.deleteIndex(data.name)
                }

                request.onsuccess = function() {
                    let db = request.result;
                    db.close()
                    resolve('index does not exist')
                };

                request.onerror = function() {
                    reject(request.error)
                };
    
            } else {
                db.close()
                resolve('index does not exist')
            }
        };
            
        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })

}

const createDocument = (data) => {
    return new Promise((resolve, reject) => {
        database(data).then((db) => {
            let transaction = db.transaction([data.collection], "readwrite");
            let collection = transaction.objectStore(data.collection);
            if (!data.data._id)
                data.data['_id'] = ObjectId()
            let request = collection.add(data.data);
            
            request.onsuccess = function() {
                db.close()
                resolve(data)
            };
            
            request.onerror = function() {
                db.close()
                reject(request.error)
            };

        }, (err) => {
            console.log(err);
        })
    })
}

const readDocument = (data, db, collection) => {
    return new Promise((resolve, reject) => {
        if (db && collection) {
            let request = collection.get(data.data._id);
                
            request.onsuccess = function() {
                data.data = request.result
                resolve(data)
            };
            
            request.onerror = function() {
                reject(request.error)
            };
        } else {

                let openRequest = indexedDB.open(data.database);

                openRequest.onsuccess = function() {
                    try {

                        let db = openRequest.result;
                        let transaction = db.transaction([data.collection], "readwrite");
                        let collection = transaction.objectStore(data.collection);
                        let request = collection.get(data.data._id);
                        
                        request.onsuccess = function() {
                            db.close()
                            data.data = request.result
                            resolve(data)
                        };
                        
                        request.onerror = function() {
                            db.close()
                            reject(request.error)
                        };
                    } catch (err) {
                        data.data = {}
                        // data.error = err
                        resolve(data)
                        return 
                    }
                };

                openRequest.onerror = function() {
                    reject(openRequest.error)
                };
            
        }
    })
}

const updateDocument = (data) => {
    return new Promise((resolve, reject) => {
        database(data).then((db) => {
            let transaction = db.transaction([data.collection], "readwrite");
            let collection = transaction.objectStore(data.collection);
           
            if (!data.data._id && data.upsert == true) {
                data.data['_id'] = ObjectId() 
            }
            if (!data.data._id) {
                db.close()
                resolve(data['error'] = 'requires _id')
            } else {
                let get = collection.get(data.data._id)
                get.onsuccess = function() {;
                    // ToDo: merge objects and update using dot notation
                    if (get.result || data.upsert == true) {
                        data.data = dotNotationToObject(data.data, get.result)

                        if (data.updateName){
                            for (let [key, value] of Object.entries(data.updateName)){
                                let val = data.data[key]
                                delete data.data[key]
                                data.data[value] = val
                            }

                        }  

                        if (data.deleteName){
                            for (let key of Object.keys(data.deleteName)){
                                delete data.data[key]
                            }

                        }
    
                        let put = collection.put(data.data);
                        
                        put.onsuccess = function() {
                            db.close()
                            resolve(data)
                        };
                        
                        put.onerror = function() {
                            db.close()
                            reject(put.error)
                        };
                    } else {
                        db.close()
                        reject('document doest not exist and upsert is not true')
                    }
                };
                
                get.onerror = function() {
                    db.close()
                    reject(get.error)
                };
            }
        })
    })
}

const deleteDocument = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);
        
        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readwrite");
            let collection = transaction.objectStore(data.collection);
                        
            let request = collection.delete(data.data._id);
            
            request.onsuccess = function() {
                db.close()
                resolve(data)
            };
            
            request.onerror = function() {
                db.close()
                reject(request.error)
            };
        } 
        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })
}

const readDocuments = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);
        
        openRequest.onsuccess = function() {
            let db = openRequest.result;
            try {
                // var transaction = db.transaction([data.collection], "readonly");
                let transaction = db.transaction([data.collection], "readonly");
                let collection = transaction.objectStore(data.collection);
                let results = [];
                // let index = collection.index(filter.name);
                // let request = index.openCursor(IDBKeyRange.upperBound(filter.value));
                let request = collection.openCursor();
                // transaction.oncomplete = resolve(results);

                request.onsuccess = function() {
                    let isFilter;
                    let cursor = request.result;
                    if (cursor) {
                        let value = cursor.value;
                        if (data.filter && data.filter.query)
                            isFilter = queryData(value, data.filter.query);
                        if (isFilter !== false)
                            results.push(value)
                        cursor.continue();
                    } else {
                        data.data = results
                        if (data.filter) {
                            if (data.filter.search)
                                data.data = searchData(data.data, data.filter)
                            if (data.filter.sort)
                                data.data = sortData(data.data, data.filter.sort)
                        }
                        resolve(data)
                    }
                };
                
                request.onerror = function() {
                    request.data = []
                    reject(request.error)
                };
            } catch (err) {
                data.data = []
                // data.error = err
                resolve(data)
                return 
            }

        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })
}

const sync = (action, data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);
        
        openRequest.onsuccess = function() {
            let db = openRequest.result;
            let transaction = db.transaction([data.collection], "readonly");
            let collection = transaction.objectStore(data.collection);
            
            if (Array.isArray(data.data)) {
                for (let item of data.data) {
                    readDocument(item, db, collection).then((doc) => {
                        if (doc.modified.on < item.modifed.on) {
                            collection.put(item)
                        }

                    })
                }
            } else {
                readDocument(item, db, collection).then((doc) => {
                    if (doc.modified.on < item.modifed.on) {
                        collection.put(item)
                    }

                })
            }

            db.close()
            resolve('synced')
        };

        openRequest.onerror = function() {
            reject(openRequest.error)
        };
    })
}

async function generateDB(data){
	const organization_id = data.organization_id;
	const apiKey = data.apiKey;
	
	let user_id = ObjectId()
	window.localStorage.setItem('user_id', user_id);

	try {
		// Create organization 
		let organization = {
			collection: 'organizatons',
			data: {
				_id: organization_id,
				name: 'untitled',
				organization_id,
				apiKey
			}
		}
		await createDocument(organization);

		// Create apiKey permission
		if (organization_id && apiKey) {
			let permissions = {	
				collection: 'permissions',
				data: {
					_id: ObjectId(),
					organization_id,
					type: "apikey",
					key: apiKey,
					hosts: [
						"*"
					],
					collections: {
						"organizations": ["read"],
						"files": ["read"]
					},
					documents: {
						"someid": {
							"permissions": [""],
							"fieldNames": {
								"name": ["read"]
							}
						}
					},
					"modules": {
						"actions": [
							"login",
							"signin",
							"userCurrentOrg",
							"createUser",
							"createOrg",
							"runIndustry"
						],
						"sendgrid": ["sendEmail"]
					},
					"admin": "true"
				}
			}

			await createDocument(permissions);
		}

		// Create user
		if (organization_id) {
			let user = {
				collection: 'users',
				data: {
					_id: user_id,
					password: btoa('0000'),
					connected_orgs: [organization_id],
					current_org: organization_id,
					organization_id: organization_id
				}
			}
			await createDocument(user);
		}

		// Create role permission
		if (user_id) {
			let role = {
				collection: 'permissions',
				data: {
					_id: ObjectId(),
					organization_id,
					"type": "role",
					"name": "admin",
					"collections": {
						"*": ["*"]
					},
					"modules": {
						"*": ""
					},
					"admin": "true",
					"hosts": ["*"]
				}
			};

			await createDocument(role);
			let role_id = role.data._id;
			
			// Create user permission
			if (role_id) {
				let data = {
					collection: 'permissions',
					data: {
						_id: ObjectId(),
						organization_id,
						"type": "user_id",
						"key": user_id,
						"roles": [role_id]
					}
				};
				await createDocument(data);
			}
		}
        return true			
		
	} catch (error) {
		console.log(error)
	}
}

const ObjectId = (rnd = r16 => Math.floor(r16).toString(16)) =>
    rnd(Date.now()/1000) + ' '.repeat(16).replace(/./g, () => rnd(Math.random()*16));

function init() {
    // Check for support.
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else { }
 }

init();

export {
    database,
    createDatabase,
    readDatabase,
    readDatabases,
    updateDatabase,
    deleteDatabase,
    
    createCollection,
    readCollections,
    updateCollection,
    deleteCollection, 

    createIndex,
    readIndex,
    updateIndex,
    deleteIndex,

    createDocument, 
    readDocument,
    readDocuments,
    updateDocument, 
    deleteDocument, 

    sync,
    ObjectId,
    generateDB
};