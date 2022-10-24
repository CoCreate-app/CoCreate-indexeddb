async function testDocuments() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
   
        // let createDocument = await CoCreate.indexeddb.createDocument({
        //     database: ['testDB', 'testDB1', 'testDB2'],
        //     collection: ['testCollection', 'testCollection1', 'testCollection2'],  
        //     data: {
        //         organization_id: '5ff747727005da1c272740ab',
        //         'books.action.title': 'matr',
        //         sports: {basketball: {teams: ['bulls']}}
        //     }
            
        // })
        // console.log('createDocument', createDocument)
        // let _id = createDocument.data[0]._id

        let readDocument = await CoCreate.indexeddb.readDocument({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'],  
            data: {
                _id,
            }
            
        })
        console.log('readDocument', readDocument)

        let updateDocument = await CoCreate.indexeddb.updateDocument({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'],  
            data: {
                _id,
                'books.action.title': 'matr',
                sports: {basketball: {teams: ['lakers']}}
            }
            
        })
        console.log('updateDocument', updateDocument)


        let deleteDocument = await CoCreate.indexeddb.deleteDocument({
            database: ['testDB', 'testDB1', 'testDB2'],
            collection: ['testCollection', 'testCollection1', 'testCollection2'],  
            // data: {
            //     _id
            // }
            filter: { 
                query: [
                    {name: 'organization_id', value: "5ff747727005da1c272740ab"}
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