/********************************************************************************
 * Copyright (C) 2020 CoCreate LLC and others.
 *
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/
import {dotNotationToObject} from '@cocreate/utils'
import {searchData, sortData, queryData} from '@cocreate/filter/src/filter.js'

function createDatabase(data){
    return Database('createDatabase', data)
}

const readDatabase = () => {
    return Database('readDatabase', data)
}

const updateDatabase = (data) => {
    return Database('updateDatabase', data)
}

const deleteDatabase = (data) => {
    return Database('deleteDatabase', data)
}

const getDatabase = (data) => {
    return Database('getDatabase', data)
}

const dbVersion = new Map()
const Database = (action, data) => {
    return new Promise((resolve, reject) => {
        if (action == 'readDatabase') {
            indexedDB.databases().then((databases) => {
                data.databases = databases
                resolve(data)
            })
        } else {
            let databases
            if (action == 'updateDatabase')
                databases = Object.entries(data.database)
            else
                databases = data.database;            
            
            if (!Array.isArray(databases))
                databases = [databases]
    
            let databasesLength = databases.length
            for (let database of databases) {
                if (action == 'updateDatabase')
                    [database, value] = database

                let openRequest;
                switch(action) {
                    case 'getDatabase':
                    case 'createDatabase':
                    case 'updateDatabase':
                        openRequest = indexedDB.open(database);
                        break;
                    case 'deleteDatabase':
                        openRequest = indexedDB.deleteDatabase(database);
                        break;
                    default:
                        data.error = 'unknown action'
                        resolve(data)                  }
    
                openRequest.onsuccess = function() {
                    let db = openRequest.result;
                    let dbs = [] // ToDo: return an array of dbinstance??
                    if (action == 'updateDatabase') {
                        // ToDo: open a cursor at database collection and save each collection and document at value
                    } else if (data.collection && data.collection.length) {
                        let collections = data.collection;
                        if (!Array.isArray(collections))
                            collections = [collections]
        
                        let collectionsLength = collections.length
                        for (let collection of collections) {
        
                            let collectionExist = db.objectStoreNames.contains(collection)
                            // if (!collectionExist || data.upgrade == true) {
                                db.close()
 
                                let version = dbVersion.get(database) || openRequest.result.version
                                let request = indexedDB.open(database, Number(version += 1));
                                dbVersion.set(database, version)
            
                                request.onupgradeneeded = function() {
                                    db = request.result;

                                    if (!collectionExist) {
                                        db = request.result;
                                        db.createObjectStore(data.collection, {keyPath: '_id', autoIncrement: true});
                                    }
                                };
                        
                                request.onsuccess = function() {
                                    data.status = 'success'
                                        
                                    collectionsLength -= 1

                                    if (!collectionsLength)
                                        databasesLength -= 1

                                    if (!databasesLength && !collectionsLength) {
                                        if (action == 'getDatabase') {
                                            let transaction = request.transaction
                                            
                                            if (data.upgrade == true && !transaction) {
                                                request.result.close()

                                                let version = dbVersion.get(database) || openRequest.result.version
                                                let upgrade = indexedDB.open(database, Number(version += 1));
                                                dbVersion.set(database, version)
                            
                                                upgrade.onupgradeneeded = function() {
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
                            
                                request.onerror = function() {
                                    data.status = 'failed'
                                    data.error = request.error
                                    collectionsLength -= 1

                                    if (!collectionsLength)
                                        databasesLength -= 1
                                    if (!databasesLength && !collectionsLength) {
                                        if (action == 'getDatabase')
                                            resolve(request)
                                        else
                                            resolve(data)
                                    }
                                };
                            // } else {

                            // }
                        }
                    } else {
                        databasesLength -= 1
                        if (!databasesLength) {
                            if (action == 'getDatabase') {
                                let transaction = openRequest.transaction
                                            
                                if (data.upgrade == true && !transaction) {                                    
                                    db.close()

                                    let version = dbVersion.get(database) || openRequest.result.version
                                    let upgrade = indexedDB.open(database, Number(version += 1));
                                    dbVersion.set(database, version)
                
                                    upgrade.onupgradeneeded = function() {
                                        resolve(upgrade)
                                    };
     
                                } else {
                                    resolve(db)
                                }
                            }
                            else
                                resolve(data)
                        }
                    }
        
                }

                openRequest.onerror = function() {
                    data.status = 'failed'
                    data.error = openRequest.error
                    resolve(data)
                };

            }
        }

    }, (err) => {
        console.log(err);
    });
}


function createCollection(data){
    return collection('createCollection', data)
}

function readCollection(data) {
    return collection('readCollection', data)
}

function updateCollection(data) {
    return collection('updateCollection', data)
}

function deleteCollection(data) {
    return collection('deleteCollection', data)
}

const collection = (action, data) => {
    return new Promise((resolve, reject) => {
        let databases = data.database;  

        if (!Array.isArray(databases))
            databases = [databases]
        let databasesLength = databases.length
        for (let database of databases) {
            let openRequest = indexedDB.open(database)

            openRequest.onsuccess = function() {
                let db = openRequest.result;
                db.close()
                let objectStoreNames = Array.from(db.objectStoreNames)
                if (action == 'readCollection') {
                    if (!data.collection)
                        data.collection = []
                    data.data = [];
                    
                    for (let collection of Array.from(objectStoreNames)){
                        data.collection.push(collection)
                        data.data.push({name: collection})
                    }

                    databasesLength -= 1
                    if (!databasesLength) {
                        resolve(data)
                    }

                } else {
                    let collections
                    if (action == 'updateCollection')
                        collections = Object.entries(data.collection)
                    else
                        collections = data.collection;
                    if (!Array.isArray(collections))
                        collections = [collections]
                    let collectionsLength = collections.length
                    for (let collection of collections) {
                        let value
                        if (action == 'updateCollection')
                            [collection, value] = collection
                        let collectionExist = db.objectStoreNames.contains(collection)
                        if (
                            collectionExist && ['updateCollection', 'deleteCollection'].includes(action) ||
                            !collectionExist && ['createCollection', 'updateCollection'].includes(action)
                        ) {
                            getDatabase({database, collection, upgrade: true}).then((db) => {
                                if (collectionExist && action == 'updateCollection') {
                                    let transaction = db.transaction;
                                    let objectStore = transaction.objectStore(collection);

                                    let valueExist = objectStoreNames.includes(value)
                                    if (!valueExist) {
                                        objectStore.name = value;
                                    }
                                    else
                                        console.log('collection does not exist')
                                
                                    db.result.close()                                        
                                    collectionsLength -= 1

                                    if (!collectionsLength)
                                        databasesLength -= 1

                                    if (!databasesLength && !collectionsLength)
                                        resolve(data)
                                    
                    
                                } else {
                                    db = db.result

                                    if (action == 'deleteCollection') {
                                        db.deleteObjectStore(collection)
                                    }
    
                                    db.close()
    
                                    collectionsLength -= 1
    
                                    if (!collectionsLength)
                                        databasesLength -= 1
        
                                    if (!databasesLength && !collectionsLength) {
                                        resolve(data)
                                    }
    
                                }
                            }, (err) => {
                                console.log(err);
                            }) 
                            
                        } else {
                            collectionsLength -= 1

                            if (!collectionsLength)
                                databasesLength -= 1

                            if (!databasesLength && !collectionsLength)
                                resolve(data)
                        }

                    }
    
                }

            };
        
            openRequest.onerror = function() {
                data.status = 'failed'
                data.error = openRequest.error
            };
        }
    }, (err) => {
        console.log(err);
    });
}


function createIndex(data){
    return index('createIndex', data)
}

function readIndex(data) {
    return index('readIndex', data)
}

function updateIndex(data) {
    return index('updateIndex', data)
}

function deleteIndex(data) {
    return index('deleteIndex', data)
}

const index = (action, data) => {
    return new Promise((resolve, reject) => {
        let databases = data.database;  
        if (!Array.isArray(databases))
            databases = [databases]

        let databasesLength = databases.length
        for (let database of databases) {
            let collections = data.collection;
            if (!Array.isArray(collections))
                collections = [collections]

            let collectionsLength = collections.length
            for (let collection of collections) {
                getDatabase({database}).then((db) => {
                    let objectStoreNames = Array.from(db.objectStoreNames)
                    if (objectStoreNames.includes(collection)) {
                        let transaction = db.transaction(collection, "readonly");
                        let objectStore = transaction.objectStore(collection);
                        let indexNames = Array.from(objectStore.indexNames)
    
                        if (action == 'readIndex') {
                            if (!data.index)
                                data.index = []
                            for (let index of Array.from(indexNames)) {
                                data.index.push(index)
                            }
                            collectionsLength -= 1
                            db.close()

                            if (!collectionsLength)
                                databasesLength -= 1
    
                            if (!databasesLength && !collectionsLength)
                                resolve(data)

                        } else {
                            db.close()
                            let indexes
                            if (action == 'updateIndex')
                                indexes = Object.entries(data.index)
                            else
                                indexes = data.index;
                            if (!Array.isArray(indexes))
                                indexes = [indexes]
                            
                            let indexesLength = indexes.length
                            for (let index of indexes) {
                                
                                getDatabase({database, upgrade: true}).then((db2) => {
                                    let transaction = db2.transaction;
                                    let objectStore = transaction.objectStore(collection);

                                    let value
                                    if (action == 'updateIndex')
                                        [index, value] = index

                                    let indexExist = indexNames.includes(index)

                                    if (action == 'createIndex') {
                                        if (!indexExist)
                                            objectStore.createIndex(index, index, {unique: false})
                                        else
                                            console.log('index exist')
                                    }
                                    if (action == 'updateIndex') {
                                        let valueExist = indexNames.includes(value)
                                        let indexObj = objectStore.index(index);
                                        if (indexExist && !valueExist) {
                                                indexObj.name = value;
                                        }
                                        else
                                            console.log('index does not exist')
                                    }
                                    if (action == 'deleteIndex') {
                                        if (indexExist)
                                            objectStore.deleteIndex(index)
                                        else
                                            console.log('index does not exist')
                                    }
                                    db2.result.close()

                                    indexesLength -= 1

                                    if (!indexesLength)
                                        collectionsLength -= 1
                                        
                                    if (!collectionsLength)
                                        databasesLength -= 1                                    
                                    
                                    if (!databasesLength && !collectionsLength && !indexesLength) {
                                        resolve(data)
                                    }                                
                                });
                            }
        
                        } 
        
                    } else {
                        db.close()
                        console.log('collection:', collection ,'does not exist')
                        resolve(data)
                    }
                });                                        

            }    
                       
            // openRequest.onerror = function() {
            //     data.status = 'failed'
            //     data.error = openRequest.error
            // };

        }

    }, (err) => {
        console.log(err);
    });
}

function createDocument(data){
    return document('createDocument', data)
}

function readDocument(data) {
    return document('readDocument', data)
}

function updateDocument(data) {
    return document('updateDocument', data)
}

function deleteDocument(data) {
    return document('deleteDocument', data)
}


const document = (action, data) => {
    return new Promise((resolve, reject) => {
        var documents = []
        let databases = data.database;  
        if (!Array.isArray(databases))
            databases = [databases]

        let databasesLength = databases.length
        for (let database of databases) {
            getDatabase({database}).then((db) => {
                let collections = data.collection;
                if (!Array.isArray(collections))
                    collections = [collections]

                let collectionsLength = collections.length
                for (let collection of collections) {
                    let collectionExist = db.objectStoreNames.contains(collection)
                    if (!collectionExist) { 
                        db.close()
                        getDatabase({database, collection}).then((db) => {
                            let transaction = db.transaction([collection], "readwrite");
                            let objectStore = transaction.objectStore(collection);
                            
                            if (data.filter) {
                                readDocuments(data).then((filterDocs) => {
                                    runDocs(action, data, objectStore, documents, filterDocs).then(() => {
                                        db.close()
                                        collectionsLength -= 1
                                        
                                        if (!collectionsLength)
                                            databasesLength -= 1
                                        
                                        if (!databasesLength && !collectionsLength) {
                                            data = createData(action, data, documents, filterDocs)
                                            resolve(data)
                                        }
                                    })
    
                                })
                            } else {
                                runDocs(action, data, objectStore, documents).then(() => {
                                    db.close()
                                    collectionsLength -= 1
                                    
                                    if (collectionsLength == 0)
                                        databasesLength -= 1

                                    if (!databasesLength && !collectionsLength) {
                                        data = createData(action, data, documents)
                                        resolve(data)
                                    }
                                })
                            }

                        }, (err) => {
                            console.log(err);
                        })

                    } else {
                        let transaction = db.transaction([collection], "readwrite");
                        let objectStore = transaction.objectStore(collection);
                        
                        
                        if (data.filter) {
                            readDocuments(data).then((filterDocs) => {
                                runDocs(action, data, objectStore, documents, filterDocs).then(() => {
                                    db.close()
                                    collectionsLength -= 1
                                    
                                    if (collectionsLength == 0)
                                        databasesLength -= 1
                                        
                                    if (!databasesLength && !collectionsLength) {
                                        data = createData(action, data, documents, filterDocs)
                                        resolve(data)
                                    }
                                })

                            })
                        } else {
                            runDocs(action, data, objectStore, documents).then(() => {
                                db.close()
                                collectionsLength -= 1
                                
                                if (collectionsLength == 0)
                                    databasesLength -= 1
                                        
                                if (!databasesLength && !collectionsLength) {
                                    data = createData(action, data, documents)
                                    resolve(data)
                                }
                            })
                        }
                    }
                }

            }, (err) => {
                console.log(err);
            })

        }
    })
}

function createData(action, data, documents, filterDocs) {
    if (action == 'updateDocument') {
        data.data = documents
        if (data.filter && data.filter.sort)
            data.data = sortData(data.data, data.filter.sort)

    }
    if (action == 'createDocument')
        data.data = documents
    if (action == 'readDocument'){
        if (filterDocs && filterDocs.length)
            data.data = documents.concat(filterDocs)
        else
            data.data = documents
    }
    if (action == 'deleteDocument')
        data.data = documents
    if (data.filter && data.filter.sort)
        data.data = sortData(data.data, data.filter.sort)
    return data
}

function runDocs(action, data, objectStore, documents, filterDocs) {
    return new Promise((resolve, reject) => {
        let log = []
        let updateData;

        let docs = data.data;
        if (!Array.isArray(docs))
            docs = [docs]

        if (filterDocs && filterDocs.length) {
            if (action == 'updateDocument') {
                updateData = {}
                for (let filterDoc of filterDocs) {
                    filterDoc = dotNotationToObject(filterDoc, updateData)
                    documents.push(filterDoc)
                }
            }
            if (action == 'deleteDocument')
                docs.push(...filterDocs)
        }

        let docsLength = docs.length
        for (let doc of docs) {

            if (action == 'updateDocument' || action == 'deleteDocument') {
                if (!doc._id && data.upsert == true)
                    doc['_id'] = ObjectId()
                updateDoc(data, doc, objectStore).then((doc) => {
                    documents.push(doc)
                    docsLength -= 1
                    if (!docsLength) {
                        resolve()
                    }
                })
            } else {
                let request;
                if (action == 'createDocument') {
                    if (!doc._id)
                        doc['_id'] = ObjectId()
                    doc = dotNotationToObject(doc)

                    request = objectStore.add(doc);
                }

                if (action == 'readDocument') {
                    request = objectStore.get(doc._id);
                }
                
                request.onsuccess = function() {
                    data.status = 'success'
                    if (action == 'createDocument') {
                        documents.push(doc)
                    }
                    if (action == 'readDocument')
                        documents.push(request.result)
                    
                    docsLength -= 1
                    if (!docsLength) {                        
                        resolve()
                    }
                };
                
                request.onerror = function() {
                    data.status = 'failed'
                    log.push({message: request.error, data: doc})
                };
            }
        }
    }, (err) => {
        console.log(err);
    })
}

function updateDoc(data, doc, objectStore) {
    return new Promise((resolve, reject) => {
        if (!doc._id) {
            data['error'] = 'requires _id'
        } else {
            let get = objectStore.get(doc._id)
            get.onsuccess = function() {;
                
                let result = get.result
                if (result || data.upsert == true) {
                    let modify = true
                    if (doc.modified && result.modified)
                        if (result.modified.on < doc.modified.on)
                            modify = false

                    if (modify) {
                        if (action == 'updateDocument') {
                            doc = dotNotationToObject(doc, get.result)

                            if (data.updateName){
                                for (let [key, value] of Object.entries(data.updateName)){
                                    let val = doc[key]
                                    delete doc[key]
                                    doc[value] = val
                                }
                            }  
        
                            if (data.deleteName){
                                for (let key of Object.keys(data.deleteName)){
                                    delete doc[key]
                                }
        
                            }
        
                            let put = objectStore.put(doc);
                            
                            put.onsuccess = function() {
                                data.status = 'success',
                                resolve(doc)
                            };
                            
                            put.onerror = function() {
                                data.status = 'failed'
                                data.error = put.error
                                resolve(doc)
                            };
    
                        }

                        if (action == 'deleteDocument') {
                            let deleteDoc = objectStore.delete(doc._id);
                            
                            deleteDoc.onsuccess = function() {
                                data.status = 'success',
                                resolve(doc)
                            };
                            
                            deleteDoc.onerror = function() {
                                data.status = 'failed'
                                data.error = deleteDoc.error
                                resolve(doc)
                            };
                        }
    
                    }
                } else {
                    data.status = 'failed'
                    data.error = 'document doest not exist and upsert is not true'
                }

            };
            
            get.onerror = function() {
                data.status = 'failed'
                data.error = get.error
            };
        }
    })
}

const readDocuments = (data) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(data.database);
        
        openRequest.onsuccess = function() {
            let db = openRequest.result;
            try {
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

async function generateDB(data) {
	const organization_id = data.organization_id;
	const apiKey = data.apiKey;
	
	let user_id = ObjectId()
	window.localStorage.setItem('user_id', user_id);

	try {
		// Create organization 
		let organization = {
            database: organization_id,
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
                database: organization_id,
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
                database: organization_id,
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
                database: organization_id,
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
                    database: organization_id,
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

export default {
    getDatabase,
    createDatabase,
    readDatabase,
    updateDatabase,
    deleteDatabase,
    
    createCollection,
    readCollection,
    updateCollection,
    deleteCollection, 

    createIndex,
    readIndex,
    updateIndex,
    deleteIndex,

    createDocument, 
    readDocument,
    updateDocument, 
    deleteDocument, 

    ObjectId,
    generateDB
};