/********************************************************************************
 * Copyright (C) 2020 CoCreate LLC and others.
 *
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/
import {ObjectId, dotNotationToObject, searchData, sortData, queryData} from '@cocreate/utils'

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
        let type = 'database'
        let databaseArray = [];

        if (data.request)
            data[type] = data.request

        if (!data['timeStamp'])
            data['timeStamp'] = new Date().toISOString()

        if (action == 'readDatabase') {
            indexedDB.databases().then((databases) => {
                for (let database of databases){
                    let isFilter = queryData(database, data.filter.query)
                    if (isFilter)
                        databaseArray.push({database, db: 'indexeddb'})
                }

                resolve(createData(data, databaseArray, type))
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
                        errorHandler(data, 'unknown action', database)
                        resolve(data)                  }
    
                openRequest.onsuccess = function() {
                    let db = openRequest.result;
                    let dbs = [] // ToDo: return an array of dbinstance??
                    if (action == 'updateDatabase') {
                         // ToDo: open a cursor at database collection and save each collection and document at value

                        let objectStoreNames = Array.from(db.objectStoreNames)
                        for (let collection of objectStoreNames) {
                            let request = collection.openCursor();
            
                            request.onsuccess = function() {
                                let cursor = request.result;
                                if (cursor) {
                                    let value = cursor.value;
                                   
                                    cursor.continue();
                                } else {
                                    // -1
                                }
                            };
                            
                            request.onerror = function() {
                                errorHandler(data, request.error, database, collection)
                            };
    
                        }
        
                    } else if (data.collection && data.collection.length) {
                        let collections = data.collection;
                        if (!Array.isArray(collections))
                            collections = [collections]
        
                        let collectionsLength = collections.length
                        for (let collection of collections) {
        
                            let collectionExist = db.objectStoreNames.contains(collection)
                            if (!collectionExist || collectionsLength == 1 && data.upgrade == true) {
                                db.close()
 
                                let version = dbVersion.get(database) || openRequest.result.version
                                let request = indexedDB.open(database, Number(version += 1));
                                dbVersion.set(database, version)
            
                                request.onupgradeneeded = function() {
                                    db = request.result;

                                    if (!collectionExist) {
                                        db = request.result;
                                        try {
                                            db.createObjectStore(collection, {keyPath: '_id', autoIncrement: true});
                                        } catch (error) {
                                            errorHandler(data, error, database, collection)
                                        }
                                    }
                                };
                        
                                request.onsuccess = function() {                                        
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
                                    errorHandler(data, request.error, database, collection)
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
                            } else {
                                collectionsLength -= 1

                                if (!collectionsLength)
                                    databasesLength -= 1
                                if (!databasesLength && !collectionsLength) {
                                    if (action == 'getDatabase')
                                        resolve(db)
                                    else
                                        resolve(data)
                                }
                            }
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
                    errorHandler(data, openRequest.error, database)
                    resolve(data)
                };

            }
        }

    }, (error) => {
        errorHandler(data, error)
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
        let type = 'collection'
        let collectionArray = [];

        if (data.request)
            data[type] = data.request

        if (!data['timeStamp'])
            data['timeStamp'] = new Date().toISOString()

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
                    if (!data[type])
                        data[type] = []
                    
                    for (let collection of objectStoreNames){
                        let isFilter = queryData({name: collection}, data.filter.query)
                        if (isFilter)
                            collectionArray.push({name: collection, db: 'indexeddb', database})
                    }

                    databasesLength -= 1
                    if (!databasesLength) {
                        resolve(createData(data, collectionArray, type))
                    }

                } else {
                    let collections
                    if (action == 'updateCollection')
                        collections = Object.entries(data[type])
                    else
                        collections = data[type];
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
                                        errorHandler(data, 'collection does not exist', database)
                                
                                    db.result.close() 

                                    collectionArray.push({name: value, db: 'indexeddb', database})                                      
                                    collectionsLength -= 1

                                    if (!collectionsLength)
                                        databasesLength -= 1

                                    if (!databasesLength && !collectionsLength){
                                        resolve(createData(data, collectionArray, type))
                                    }                                    
                    
                                } else {
                                    db = db.result

                                    if (action == 'deleteCollection') {
                                        db.deleteObjectStore(collection)
                                    }

                                    db.close()

                                    collectionArray.push({name: collection, db: 'indexeddb', database})
                                    collectionsLength -= 1
    
                                    if (!collectionsLength)
                                        databasesLength -= 1
        
                                    if (!databasesLength && !collectionsLength) {
                                        resolve(createData(data, collectionArray, type))
                                    }
    
                                }
                            }, (error) => {
                                errorHandler(data, error, database)
                            }) 
                            
                        } else {
                            collectionArray.push({name: collection, db: 'indexeddb', database})
                            collectionsLength -= 1

                            if (!collectionsLength)
                                databasesLength -= 1

                            if (!databasesLength && !collectionsLength) {
                                resolve(createData(data, collectionArray, type))
                            }
                        }

                    }
    
                }

            };
        
            openRequest.onerror = function() {
                errorHandler(data, openRequest.error, database)
                databasesLength -= 1

                if (!databasesLength) {
                    resolve(data)
                }
            };
        }
    }, (error) => {
        errorHandler(data, error)
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
        let type = 'index'
        let indexArray = [];

        if (data.request)
            data[type] = data.request

        if (!data['timeStamp'])
            data['timeStamp'] = new Date().toISOString()
        
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
                            for (let index of indexNames) {
                                let isFilter = queryData({name: index}, data.filter.query)
								if (isFilter)
									indexArray.push({name: index, db: 'indexeddb', database, collection})
                            }
                            collectionsLength -= 1
                            db.close()

                            if (!collectionsLength)
                                databasesLength -= 1
    
                            if (!databasesLength && !collectionsLength)
                                resolve(createData(data, indexArray, type))

                        } else {
                            db.close()
                            let indexes
                            if (action == 'updateIndex')
                                indexes = Object.entries(data[type])
                            else
                                indexes = data[type];
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
                                        if (!indexExist) {
                                            objectStore.createIndex(index, index, {unique: false})
                                            indexArray.push({name: index, db: 'indexeddb', database, collection})
                                        }
                                        else
                                            errorHandler(data, 'index exist', database, collection)
                                    }
                                    if (action == 'updateIndex') {
                                        let valueExist = indexNames.includes(value)
                                        let indexObj = objectStore.index(index);
                                        if (indexExist && !valueExist) {
                                            indexObj.name = value;
                                            indexArray.push({name: value, db: 'indexeddb', database, collection})
                                        }
                                        else
                                            errorHandler(data, 'index does not exist', database, collection)

                                    }
                                    if (action == 'deleteIndex') {
                                        if (indexExist) {
                                            objectStore.deleteIndex(index)
                                            indexArray.push({name: index, db: 'indexeddb', database, collection})
                                        }
                                        else
                                            errorHandler(data, 'index does not exist', database, collection)
                                    }
                                    db2.result.close()

                                    indexesLength -= 1

                                    if (!indexesLength)
                                        collectionsLength -= 1
                                        
                                    if (!collectionsLength)
                                        databasesLength -= 1                                    
                                    
                                    if (!databasesLength && !collectionsLength && !indexesLength) {
                                        resolve(createData(data, indexArray, type))
                                    }                                
                                });
                            }
        
                        } 
        
                    } else {
                        db.close()
                        errorHandler(data, `collection: ${collection} does not exist`, database, collection)
                        resolve(data)
                    }
                });                                        

            }    
        }

    }, (error) => {
        errorHandler(data, error)
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
        let type = 'document'
        let documents = []
        
        if (data.request)
            data[type] = data.request

        if (!data['timeStamp'])
            data['timeStamp'] = new Date().toISOString()
        
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
                            if (data.filter || action == 'readDocument') {
                                db.close()
                                readDocuments(data, database, collection).then((filterDocs) => {
                                    getDatabase({database}).then((db) => {
                                        let transaction = db.transaction([collection], "readwrite");
                                        let objectStore = transaction.objectStore(collection);
                                        
                                        runDocs({action, data, objectStore, documents, filterDocs, database, collection, type}).then(() => {
                                            db.close()
                                            collectionsLength -= 1
                                            
                                            if (!collectionsLength)
                                                databasesLength -= 1
                                            
                                            if (!databasesLength && !collectionsLength) {
                                                resolve(createData(data, documents, type))
                                            }
                                        })
                                    })
    
                                })
                            } else {
                                let transaction = db.transaction([collection], "readwrite");
                                let objectStore = transaction.objectStore(collection);
    
                                runDocs({action, data, objectStore, documents, database, collection, type}).then(() => {
                                    db.close()
                                    collectionsLength -= 1
                                    
                                    if (!collectionsLength)
                                        databasesLength -= 1

                                    if (!databasesLength && !collectionsLength) {
                                        resolve(createData(data, documents, type))
                                    }
                                })
                            }

                        }).catch((error) => {
                            errorHandler(data, {message: error, data}, database)
                            collectionsLength -= 1
                                            
                            if (!collectionsLength)
                                databasesLength -= 1

                            if (!databasesLength && !collectionsLength) 
                                resolve(createData(data, documents, type))
        
                        })

                    } else { 
                        if (data.filter || action == 'readDocument' && !data.document) {
                            db.close()
                            readDocuments(data, database, collection).then((filterDocs) => {
                                getDatabase({database}).then((db) => {
                                    let transaction = db.transaction([collection], "readwrite");
                                    let objectStore = transaction.objectStore(collection);
                                    
                                    runDocs({action, data, objectStore, documents, filterDocs, database, collection, type}).then(() => {
                                        db.close()
                                        collectionsLength -= 1
                                        
                                        if (!collectionsLength)
                                            databasesLength -= 1
                                            
                                        if (!databasesLength && !collectionsLength) {
                                            resolve(createData(data, documents, type))
                                        }
                                    })                                
                                })
                            })
                        } else {
                            let transaction = db.transaction([collection], "readwrite");
                            let objectStore = transaction.objectStore(collection);
    
                            runDocs({action, data, objectStore, documents, database, collection, type}).then(() => {
                                db.close()
                                collectionsLength -= 1
                                
                                if (!collectionsLength)
                                    databasesLength -= 1
                                if (!databasesLength && !collectionsLength) {
                                    resolve(createData(data, documents, type))
                                }
                            })
                        }
                    }
                }

            }).catch((error) => {
                errorHandler(data, {message: error, data}, database)

                databasesLength -= 1

                if (!databasesLength) 
                    resolve(createData(data, documents, type))
            })

        }
    })
}

function runDocs({action, data, objectStore, documents, filterDocs, database, collection, type}) {
    return new Promise((resolve, reject) => {
        let docs = []
        
        if (Array.isArray(data[type]))
            docs.push(...data[type]);
        else if (data[type] != undefined && action == 'createDocument')
            docs.push(data[type])
        else if (data[type] != undefined)
            docs.push({...data[type]})
        

        if (filterDocs && filterDocs.length) {
            if (action == 'readDocument') {
                for (let i = 0; i < filterDocs.length; i++)
                    documents.push({db: 'indexeddb', database, collection, ...filterDocs[i]})

            }

            if (action == 'updateDocument') {
                let updateData = docs[0];
                if (updateData)
                    docs.shift();
                for (let filterDoc of filterDocs) {
                    filterDoc = dotNotationToObject(updateData, filterDoc)
                    docs.push(filterDoc)
                }
            }

            if (action == 'deleteDocument')
                docs.push(...filterDocs)
        }

        let docsLength = docs.length
       
        if (docsLength > 0) {
            for (let doc of docs) {
                // ToDo deDuplcate document_id per collection
                delete doc.db
                delete doc.database
                delete doc.collection
                
                if (action == 'updateDocument' || action == 'deleteDocument') {
                    if (doc._id) {
                        if (data.organization_id)
                            doc['organization_id'] = data.organization_id
                        doc['modified'] = {on: data.timeStamp, by: data.user_id || data.clientId}

                        updateDoc(action, data, doc, objectStore, database, collection).then((doc) => {
                            doc.db = 'indexeddb'
                            doc.database = database
                            doc.collection = collection
                            documents.push(doc)
                            docsLength -= 1
                            if (!docsLength) {
                                resolve()
                            }
                        })    
                    } else {
                        docsLength -= 1
                        if (!docsLength)
                            resolve()
                    }
                } else {
                    let request;
                    if (action == 'createDocument') {
                        if (!doc._id)
                            doc['_id'] = ObjectId()
                        doc = dotNotationToObject(doc)

                        if (data.organization_id)
                            doc['organization_id'] = data.organization_id
                        doc['created'] = {on: data.timeStamp, by: data.user_id || data.clientId}
                        request = objectStore.add(doc);
                    }

                    if (action == 'readDocument' && doc._id) {
                        request = objectStore.get(doc._id);
                    } else {
                        docsLength -= 1
                        errorHandler(data, {message: 'requires _id', document: doc}, database, objectStore.name)
                        if (!docsLength) {                        
                            resolve()
                        }
                    }
                    
                    request.onsuccess = function() {
                        if (request.result) {
                            if (action == 'readDocument')
                                doc = request.result
                            doc.db = 'indexeddb'
                            doc.database = database
                            doc.collection = collection
            
                            documents.push(doc)
                        }
                        docsLength -= 1
                        if (!docsLength) {                        
                            resolve()
                        }
                    };
                    
                    request.onerror = function() {
                        errorHandler(data, {message: request.error, document: doc}, database, objectStore.name)
                        resolve()
                    };
                }
            }
        } else {
            resolve()
        }
    }, (error) => {
        errorHandler(data, {message: error, document: doc}, database, objectStore.name)
    })
}

function updateDoc(action, data, doc, objectStore, database, collection) {
    return new Promise((resolve, reject) => {
            let get = objectStore.get(doc._id)
            get.onsuccess = function() {;
                
                let result = get.result
                if (result || data.upsert == true) {
                    let modify = true
                    if (result && doc.modified && result.modified)
                        if (doc.modified.on < result.modified.on)
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
                                resolve(doc)
                            };
                            
                            put.onerror = function() {
                                errorHandler(data, put.error, database, collection, doc)
                                resolve(doc)
                            };
    
                        }

                        if (action == 'deleteDocument') {
                            let deleteDoc = objectStore.delete(doc._id);
                            
                            deleteDoc.onsuccess = function() {
                                resolve(doc)
                            };
                            
                            deleteDoc.onerror = function() {
                                errorHandler(data, deleteDoc.error, database, collection, doc)
                                resolve(doc)
                            };
                        }
    
                    } else {
                        // ToDo: handle if _id not found upsert
                        errorHandler(data, 'doc in db is newer', database, collection, doc)
                        resolve(doc)
                    }
                } else {
                    errorHandler(data, 'document doest not exist and upsert is not true', database, collection, doc)
                    resolve(doc)
                }

            };
            
            get.onerror = function() {
                errorHandler(data, get.error, database, collection, doc)
                resolve(doc)
            };
        
    })
}

const readDocuments = (data, database, collection) => {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(database);
        
        openRequest.onsuccess = function() {
            let db = openRequest.result;
            try {
                let transaction = db.transaction([collection], "readonly");
                let objectStore = transaction.objectStore(collection);
                
                if (data.filter) {
                    let count = objectStore.count();
                    count.onsuccess = function() {
                        data.filter.count = count.result
                    }
                }

                let isIndex = false
                let indexName;
                if (data.filter && data.filter.sort && data.filter.sort[0] && data.filter.sort[0].name) {
                    indexName = data.filter.sort[0].name
                    if (indexName.includes('-'))
                        isIndex = false
                    else
                        isIndex = true
                }

                if (isIndex) {
                    let direction = data.filter.sort[0].direction
                    if (direction == 'desc')
                        direction = 'prev'
                    else
                        direction = 'next'

                    let indexNames = Array.from(objectStore.indexNames)
                    let indexExist = indexNames.includes(indexName)
                    if (!indexExist) {
                        db.close()
                        getDatabase({database, upgrade: true}).then((db2) => {
                            let transaction = db2.transaction;
                            let objectStore = transaction.objectStore(collection);
                            try {
                                objectStore.createIndex(indexName, indexName, {unique: false})
                            } catch(error) {
                                // console.log(error)
                            }
                            const indexStore = objectStore.index(indexName);

                            readDocs(data, database, collection, indexStore, direction).then((results) => {
                                if (db2 && db2.close)
                                    db2.close()
                                resolve(results)
                            })
                        })
                    } else {
                        const indexStore = objectStore.index(indexName);
                        readDocs(data, database, collection, indexStore, direction).then((results) => {
                            db.close()
                            resolve(results)
                        })
                    }
                } else {
                    readDocs(data, database, collection, objectStore).then((results) => {
                        db.close()
                        resolve(results)
                    })      
                }
            } catch (error) {
                errorHandler(data, error, database)
                db.close()
                resolve([])
                return 
            }

        };

        openRequest.onerror = function() {
            errorHandler(data, openRequest.error)
            resolve(data)
        };
    })
}

async function readDocs(data, database, collection, objectStore, direction) {
    return new Promise((resolve, reject) => {
                
        let results = [], index = 0, limit
        if (data.filter) {
            if (data.filter.startIndex)
                index = data.filter.startIndex
            if (data.filter.limit)
                limit = data.filter.limit
            if (limit)
                limit = index + limit;
        }

        const request = objectStore.openCursor(null, direction);
        request.onsuccess = function() {
            let cursor = request.result;
            if (cursor) {
                let isFilter = true;
                let value = cursor.value;
                if (data.filter) {
                    if (data.filter.query)
                        isFilter = queryData(value, data.filter.query);
                    if (isFilter && data.filter.search)
                        isFilter = searchData(value, data.filter.search);
                }
                if (isFilter !== false)
                    results.push(value)
                if (limit && limit == results.length) {
                    results = results.slice(index, limit)
                    resolve(results)
                } else
                    cursor.continue();
            } else {
                if (index)
                    results = results.slice(index)
                resolve(results)
            }
        }
        
        request.onerror = function() {
            errorHandler(data, request.error, database, collection)
            db.close()
            resolve([])
        };

    });
}

function generateDB(data) {
	const organization_id = data.organization_id;
	const apiKey = data.apiKey;
	const user_id = data.user_id;

	try {
		// Create organization 
		let organization = {
            database: organization_id,
			collection: 'organizatons',
			document: {
				_id: organization_id,
				name: 'untitled',
				apiKey,
                organization_id
			}
		}
		createDocument(organization);

		// Create apiKey permission
		if (organization_id && apiKey) {
			let permissions = {	
                database: organization_id,
				collection: 'permissions',
				document: {
					_id: ObjectId(),
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
							"signIn",
                            "signUp",
							"userCurrentOrg",
							"createOrg",
							"runIndustry"
						],
						"sendgrid": ["sendEmail"]
					},
					"admin": "false",
                    organization_id,
				}
			}

			createDocument(permissions);
		}

		// Create user
		if (organization_id) {
			let user = {
                database: organization_id,
				collection: 'users',
				document: {
					_id: user_id,
					password: btoa('0000'),
					connected_orgs: [organization_id],
					current_org: organization_id,
					organization_id
				}
			}
			createDocument(user);
		}

		// Create role permission
		if (user_id) {
			let role = {
                database: organization_id,
				collection: 'permissions',
				document: {
					_id: ObjectId(),
					"type": "role",
					"name": "admin",
					"collections": {
						"*": ["*"]
					},
					"modules": {
						"*": ""
					},
					"admin": "true",
					"hosts": ["*"],
                    organization_id,
				}
			};

			createDocument(role);
			let role_id = role.document._id;
			
			// Create user permission
			if (role_id) {
				let userPermission = {
                    database: organization_id,
					collection: 'permissions',
					document: {
						_id: ObjectId(),
						organization_id,
						"type": "user_id",
						"key": user_id,
						"roles": [role_id]
					}
				};
				createDocument(userPermission);
			}
		}
        return true			
		
	} catch (error) {
        errorHandler(data, error)
	}
}

function errorHandler(data, error, database, collection){
    if (typeof error == 'object')
        error['db'] = 'indexeddb'
    else
        error = {db: 'indexeddb', message: error}

    if (database)
        error['database'] = database
    if (collection)
        error['collection'] = collection
    if (data.error)
        data.error.push(error)
    else
        data.error = [error]

}

function createData(data, array, type) {
    data.request = data[type] || {}

    if (data.filter && data.filter.sort)
        data[type] = sortData(array, data.filter.sort)
    else
        data[type] = array
    
    if (data.returnLog){
        if (!data.log)
            data.log = []
        data.log.push(...data[type])
    }

    return data
}


function init() {
    // Check for support.
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else { }
 }

init();

export default {
    ObjectId,
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

    generateDB
};