async function testIndexes() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        let createIndexes = await CoCreate.indexeddb.createIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'],
            index: 'testIndexes'
            
        })
        console.log('createIndexes', createIndexes)

        let readIndexes = await CoCreate.indexeddb.readIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2']  
        })
        console.log('readIndexes', readIndexes)

        let updateIndexes = await CoCreate.indexeddb.updateIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'], 
            index: {testIndexes: 'testIndexes1'}
        })
        console.log('updateIndexes', updateIndexes)

        let deleteIndexes = await CoCreate.indexeddb.deleteIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'],
            index: 'testIndexes1'
        })
        console.log('deleteIndexes', deleteIndexes)
        
    }
}
