async function testIndexes() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        let createIndexes = await Coindex.createeddb.createIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            index: 'testIndexes'

        })
        console.log('createIndexes', createIndexes)

        let readIndexes = await Coindex.createeddb.readIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2']
        })
        console.log('readIndexes', readIndexes)

        let updateIndexes = await Coindex.createeddb.updateIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            index: { testIndexes: 'testIndexes1' }
        })
        console.log('updateIndexes', updateIndexes)

        let deleteIndexes = await Coindex.createeddb.deleteIndex({
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            index: 'testIndexes1'
        })
        console.log('deleteIndexes', deleteIndexes)

    }
}
