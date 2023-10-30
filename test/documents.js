async function testDocuments() {
    if (!('indexedDatabase' in window)) {
        console.log("This browser doesn't support IndexedDatabase.");
        return;
    } else {

        let createObject = await CoCreate.indexeddb.process({
            method: 'object.create',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArray', 'testArray1', 'testArray2'],
            object: {
                organization_id: '5ff747727005da1c272740ab',
                'books.action.title': 'matr',
                sports: { basketball: { teams: ['bulls'] } }
            }

        })
        console.log('createObject', createObject)
        let _id = createObject.object[0]._id

        let readObject = await CoCreate.indexeddb.process({
            method: 'object.read',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArray', 'testArray1', 'testArray2'],
            object: {
                _id,
            }

        })
        console.log('readObject', readObject)

        let updateObject = await CoCreate.indexeddb.process({
            method: 'object.update',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArray', 'testArray1', 'testArray2'],
            object: {
                _id,
                'books.action.title': 'matr',
                sports: { basketball: { teams: ['lakers'] } }
            }

        })
        console.log('updateObject', updateObject)


        let deleteObject = await CoCreate.indexeddb.process({
            method: 'object.delete',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArray', 'testArray1', 'testArray2'],
            // object: {
            //     _id
            // }
            $filter: {
                query: [
                    { key: 'organization_id', value: "5ff747727005da1c272740ab" }
                ]
            }


        })
        console.log('deleteObject', deleteObject)

        // let deleteDatabase = await CoCreate.indexeddb.deleteDatabase({
        //     database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
        // })
        // console.log('deleteDatabase', deleteDatabase)
    }
}