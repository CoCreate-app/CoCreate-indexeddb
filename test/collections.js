async function testCollections() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {

        let createCollection = await CoCreate.indexeddb.createCollection({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2']  
            
        })
        console.log('createCollection', createCollection)

        let readCollection = await CoCreate.indexeddb.readCollection({
            database: ['testDB', 'testDB1', 'testDB2'],
        })
        console.log('readCollection', readCollection)

        let updateCollection = await CoCreate.indexeddb.updateCollection({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: {testCollection: 'testCollectionA'}
        })
        console.log('updateCollection', updateCollection)


        let deleteCollection = await CoCreate.indexeddb.deleteCollection({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollectionA', 'testCollection1', 'testCollection2']  
        })
        console.log('deleteCollection', deleteCollection)
        
    }
}
