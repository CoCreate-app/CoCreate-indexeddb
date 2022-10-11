async function testDatabases() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        let createDatabase = await CoCreate.indexeddb.createDatabase({
            database: 'testDB',
            
        })
        console.log('createDatabase', createDatabase)

        let readDatabase = await CoCreate.indexeddb.readDatabase({
            database: 'testDB',
        })
        console.log('readDatabase', readDatabase)

        // let updateDatabase = await CoCreate.indexeddb.updateDatabase({
        //     database: 'testDB',
        //     updateDatabase: {testDatabase: 'testDatabase1'}
        // })
        // console.log('updateDatabase', updateDatabase)


        let deleteDatabase = await CoCreate.indexeddb.deleteDatabase({
            database: 'testDB',
        })
        console.log('deleteDatabase', deleteDatabase)

        
    }
}
