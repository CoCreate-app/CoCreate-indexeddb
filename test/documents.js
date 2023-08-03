async function testDocuments() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {

        let createDocument = await CoCreate.indexeddb.process({
            method: 'create.object',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            object: {
                organization_id: '5ff747727005da1c272740ab',
                'books.action.title': 'matr',
                sports: { basketball: { teams: ['bulls'] } }
            }

        })
        console.log('createDocument', createDocument)
        let _id = createDocument.object[0]._id

        let readDocument = await CoCreate.indexeddb.process({
            method: 'read.object',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            object: {
                _id,
            }

        })
        console.log('readDocument', readDocument)

        let updateDocument = await CoCreate.indexeddb.process({
            method: 'update.object',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            object: {
                _id,
                'books.action.title': 'matr',
                sports: { basketball: { teams: ['lakers'] } }
            }

        })
        console.log('updateDocument', updateDocument)


        let deleteDocument = await CoCreate.indexeddb.process({
            method: 'delete.object',
            database: ['testDB', 'testDB1', 'testDB2'],
            array: ['testCollection', 'testCollection1', 'testCollection2'],
            // object: {
            //     _id
            // }
            filter: {
                query: [
                    { name: 'organization_id', value: "5ff747727005da1c272740ab" }
                ]
            }


        })
        console.log('deleteDocument', deleteDocument)

        // let deleteDatabase = await CoCreate.indexeddb.deleteDatabase({
        //     database: ['testDB', 'testDB1', 'testDB2'],
        // })
        // console.log('deleteDatabase', deleteDatabase)
    }
}