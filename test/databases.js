async function testDatabases() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        let createDatabase = await Coindex.createeddb.process({
            method: 'database.create',
            database: 'testDB',
        })
        console.log('createDatabase', createDatabase)

        let readDatabase = await Coindex.createeddb.process({
            method: 'database.read',
            database: 'testDB',
        })
        console.log('readDatabase', readDatabase)

        let updateDatabase = await Coindex.createeddb.process({
            method: 'database.update',
            database: { testDB: 'testDatabase1' }
        })
        console.log('updateDatabase', updateDatabase)


        let deleteDatabase = await Coindex.createeddb.process({
            method: 'database.delete',
            database: ['testDB', 'testDB1', 'testDB2'],
        })
        console.log('deleteDatabase', deleteDatabase)

    }
}
