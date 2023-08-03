async function testDatabases() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        let createDatabase = await CoCreate.indexeddb.process({
            method: 'create.database',
            database: 'testDB',
        })
        console.log('createDatabase', createDatabase)

        let readDatabase = await CoCreate.indexeddb.process({
            method: 'read.database',
            database: 'testDB',
        })
        console.log('readDatabase', readDatabase)

        let updateDatabase = await CoCreate.indexeddb.process({
            method: 'update.database',
            database: { testDB: 'testDatabase1' }
        })
        console.log('updateDatabase', updateDatabase)


        let deleteDatabase = await CoCreate.indexeddb.process({
            method: 'delete.database',
            database: ['testDB', 'testDB1', 'testDB2'],
        })
        console.log('deleteDatabase', deleteDatabase)

    }
}
