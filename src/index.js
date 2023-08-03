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
import uuid from '@cocreate/uuid'

let status = true;
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

    status = value;
}

async function process(data) {
    try {
        let newData = [];

        let type = data.method.split('.');
        type = type[type.length - 1];

        if (type === 'database')
            await processDatabase(data, newData, type)
        else {
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
                    if (data.filter && data.filter.query) {
                        let isFilter = queryData(database, data.filter.query)
                        if (isFilter)
                            newData.push({ storage: 'indexeddb', database })
                    } else
                        newData.push({ storage: 'indexeddb', database })
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
            if (data.filter && data.filter.query) {
                let isFilter = queryData({ name: objectStoreNames[i] }, data.filter.query)
                if (isFilter)
                    newData.push({ name: objectStoreNames, storage: 'indexeddb', database })
            } else
                newData.push({ name: objectStoreNames[i], storage: 'indexeddb', database })
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
                newData.push({ name: array, storage: 'indexeddb', database })
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
                if (data.filter && data.filter.query)
                    if (!(queryData({ name }, data.filter.query))) continue

                newData.push({ name, storage: 'indexeddb', database, array })
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
                    newData.push({ name: index, storage: 'indexeddb', database, array })
                else
                    errorHandler(data, error, database, array)

                db.result.close()
            }
        }
    }
}

async function processObject(data, newData, database, array, type) {
    let db = await processDatabase({ method: 'get.database', database })
    let filteredObjects
    let arrayExist = db.objectStoreNames.contains(array)
    if (arrayExist) {
        if (data.filter || data.method == 'read.object' && (!data.object || !data.object.length)) {
            db.close()
            filteredObjects = await readObject(data, database, array)
            db = await processDatabase({ method: 'get.database', database })
        }
    } else {
        db.close()
        db = processDatabase({ method: 'get.database', database, array })
        if (data.filter || data.method == 'read.object' && (!data.object || !data.object.length)) {
            db.close()
            filteredObjects = await readObject(data, database, array)
            db = processDatabase({ method: 'get.database', database })
        }
    }

    let transaction, objectStore
    if (array && db) {
        transaction = db.transaction([array], "readwrite");
        objectStore = transaction.objectStore(array);
    }

    let objects = []

    if (Array.isArray(data[type]))
        objects.push(...data[type]);
    // else if (data[type] != undefined && data.method == 'create.object')
    //     objects.push(data[type])
    // else if (data[type] != undefined)
    //     objects.push({...data[type]})


    if (filteredObjects && filteredObjects.length) {
        if (data.method == 'read.object') {
            for (let i = 0; i < filteredObjects.length; i++)
                newData.push({ storage: 'indexeddb', database, array, ...filteredObjects[i] })

        }

        if (data.method == 'update.object') {
            let updateData = objects[0];
            if (updateData)
                objects.shift();
            for (let filterDoc of filteredObjects) {
                filterDoc = dotNotationToObject(updateData, filterDoc)
                objects.push(filterDoc)
            }
        }

        if (data.method == 'delete.object')
            objects.push(...filteredObjects)
    }

    for (let i = 0; i < objects.length; i++) {
        // TODO deDuplcate object per array
        delete objects[i].storage
        delete objects[i].database
        delete objects[i].array

        if (data.method == 'update.object' || data.method == 'delete.object') {
            if (objects[i]._id) {
                if (data.organization_id)
                    objects[i]['organization_id'] = data.organization_id
                objects[i]['modified'] = { on: data.timeStamp, by: data.user_id || data.clientId }

                await updateObject(data, objects[i], objectStore, database, array)
                objects[i].storage = 'indexeddb'
                objects[i].database = database
                objects[i].array = array
                newData.push(objects[i])
            }
        } else {
            if (data.method == 'create.object') {
                if (!objects[i]._id)
                    objects[i]['_id'] = ObjectId()
                objects[i] = dotNotationToObject(objects[i])

                if (data.organization_id)
                    objects[i]['organization_id'] = data.organization_id
                objects[i]['created'] = { on: data.timeStamp, by: data.user_id || data.clientId }
                await addGet(data, newData, database, array, objects[i], objectStore, 'add')
            }

            if (data.method == 'read.object') {
                if (data.method == 'read.object' && objects[i]._id)
                    await addGet(data, newData, database, array, objects[i], objectStore, 'get')
                else
                    errorHandler(data, { message: 'requires _id', object: objects[i] }, database, objectStore.name)
            }
        }
    }

    db.close()
}

function addGet(data, newData, database, array, object, objectStore, operator) {
    return new Promise((resolve, reject) => {
        let request = objectStore[operator](object);

        request.onsuccess = function () {
            if (request.result) {
                if (data.method == 'read.object')
                    object = request.result
                object.storage = 'indexeddb'
                object.database = database
                object.array = array

                newData.push(object)
            }
            resolve()
        };

        request.onerror = function () {
            errorHandler(data, { message: request.error, object }, database, objectStore.name)
            resolve()
        };

    });
}

function updateObject(data, doc, objectStore, database, array) {
    return new Promise((resolve, reject) => {
        let get = objectStore.get(doc._id)
        get.onsuccess = function () {
            let result = get.result
            if (result || data.upsert == true) {
                let modify = true
                if (result && doc.modified && result.modified)
                    if (doc.modified.on < result.modified.on)
                        modify = false

                if (modify) {
                    if (data.method == 'update.object') {
                        doc = dotNotationToObject(doc, get.result)

                        if (data.updateName) {
                            for (let key of Object.keys(data.updateName)) {
                                let val = doc[key]
                                delete doc[key]
                                doc[data.updateName[key]] = val
                            }
                        }

                        if (data.deleteName) {
                            for (let key of Object.keys(data.deleteName)) {
                                delete doc[key]
                            }

                        }

                        let put = objectStore.put(doc);

                        put.onsuccess = function () {
                            resolve(doc)
                        };

                        put.onerror = function () {
                            errorHandler(data, put.error, database, array, doc)
                            resolve(doc)
                        };

                    }

                    if (data.method == 'delete.object') {
                        let deleteDoc = objectStore.delete(doc._id);

                        deleteDoc.onsuccess = function () {
                            resolve(doc)
                        };

                        deleteDoc.onerror = function () {
                            errorHandler(data, deleteDoc.error, database, array, doc)
                            resolve(doc)
                        };
                    }

                } else {
                    // TODO: handle if _id not found upsert
                    errorHandler(data, 'doc in db is newer', database, array, doc)
                    resolve(doc)
                }
            } else {
                errorHandler(data, 'object doest not exist and upsert is not true', database, array, doc)
                resolve(doc)
            }

        };

        get.onerror = function () {
            errorHandler(data, get.error, database, array, doc)
            resolve(doc)
        };

    })
}

function readObject(data, database, array) {
    return new Promise(async (resolve, reject) => {

        try {
            let db = await processDatabase({ method: 'get.database', database })
            let transaction = db.transaction([array], "readonly");
            let objectStore = transaction.objectStore(array);

            if (data.filter) {
                let count = objectStore.count();
                count.onsuccess = function () {
                    data.filter.count = count.result
                }
            }

            let isIndex = false
            let indexName, direction;
            if (data.filter && data.filter.sort && data.filter.sort[0] && data.filter.sort[0].name) {
                indexName = data.filter.sort[0].name
                // if (indexName.includes('-'))
                //     isIndex = false
                // else
                // isIndex = true
            }

            if (isIndex) {
                direction = data.filter.sort[0].direction
                if (direction == 'desc')
                    direction = 'prev'
                else
                    direction = 'next'

                let indexNames = Array.from(objectStore.indexNames)
                let indexExist = indexNames.includes(indexName)
                if (!indexExist) {
                    db.close()
                    db = await processDatabase({ method: 'get.database', database, upgrade: true })
                    transaction = db.transaction;
                    objectStore = transaction.objectStore(array);
                    try {
                        objectStore.createIndex(indexName, indexName, { unique: false })
                    } catch (error) {
                        // console.log(error)
                    }
                }
                objectStore = objectStore.index(indexName);
            }

            let results = [], index = 0, limit
            if (data.filter) {
                if (data.filter.index)
                    index = data.filter.index
                if (data.filter.limit)
                    limit = data.filter.limit
                if (limit)
                    limit = index + limit;
            }

            const request = objectStore.openCursor(null, direction);
            request.onsuccess = function () {
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

            request.onerror = function () {
                errorHandler(data, request.error, database, array)
                db.close()
                resolve([])
            };


            if (db && db.close)
                db.close()
            // return results

        } catch (error) {
            errorHandler(data, error, database, array)
            resolve([])
        }
    });
}


async function generateDB(organization = { object: {} }, user = { object: {} }) {
    const organization_id = organization.object._id || ObjectId();
    const defaultKey = organization.object.key || uuid.generate();
    const user_id = user.object._id || ObjectId();

    let apiKey = await process({ method: 'create.object', database: organization_id, array: 'keys', organization_id })
    if (apiKey && apiKey.object && apiKey.object[0])
        return

    try {
        // Create organization 
        organization.method = 'create.object'
        organization.database = organization_id
        organization.array = 'organizations'
        organization.object._id = organization_id
        organization.object.name = organization.object.name || 'untitiled'
        organization.organization_id = organization_id
        process(organization);

        // Create user
        user.method = 'create.object'
        user.database = organization_id
        user.array = 'users'
        user.object._id = user_id
        user.object.firstname = user.object.firstname || 'untitiled'
        user.object.lastname = user.object.lastname || 'untitiled'
        user.organization_id = organization_id
        process(user);

        // Create default key
        let key = {
            method: 'create.object',
            database: organization_id,
            array: 'keys',
            object: {
                _id: ObjectId(),
                type: "key",
                key: defaultKey,
                actions: {
                    signIn: true,
                    signUp: true
                },
                default: true
            },
            organization_id
        }
        process(key);

        // Create role
        let role_id = ObjectId();
        let role = {
            method: 'create.object',
            database: organization_id,
            array: 'keys',
            object: {
                _id: role_id,
                type: "role",
                name: "admin",
                admin: "true"
            },
            organization_id
        };
        process(role);

        // Create user key
        let userKey = {
            method: 'create.object',
            database: organization_id,
            array: 'keys',
            object: {
                _id: ObjectId(),
                type: "user",
                key: user_id,
                array: 'users', // could be any array
                roles: [role_id],
                email: user.object.email,
                password: user.object.password || btoa('0000')
            },
            organization_id
        };
        process(userKey);

        return [organization, key, user, role, userKey]

    } catch (error) {
        return false
    }
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

function createData(data, newData, type) {
    data.request = data[type] || {}

    if (data.filter && data.filter.sort)
        data[type] = sortData(newData, data.filter.sort)
    else
        data[type] = newData

    if (data.returnLog) {
        if (!data.log)
            data.log = []
        data.log.push(...data[type])
    }

    return data
}

init();

export default {
    status,
    ObjectId,
    process,
    generateDB
};