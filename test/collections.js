async function testCollections() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {

        let createCollection = await CoCreate.indexeddb.process({
            method: 'create.array',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2']

        })
        console.log('createCollection', createCollection)

        let readCollection = await CoCreate.indexeddb.process({
            method: 'read.array',
            database: ['testDB', 'testDB1', 'testDB2'],
        })
        console.log('readCollection', readCollection)

        let updateCollection = await CoCreate.indexeddb.process({
            method: 'update.array',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: { testCollection: 'testCollectionA' }
        })
        console.log('updateCollection', updateCollection)


        let deleteCollection = await CoCreate.indexeddb.process({
            method: 'delete.array',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollectionA', 'testCollection1', 'testCollection2']
        })
        console.log('deleteCollection', deleteCollection)

    }
}
