async function testArrays() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {

        let createObject = await Coindex.createeddb.process({
            method: 'array.create',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArray', 'testArray1', 'testArray2']

        })
        console.log('createObject', createObject)

        let readObject = await Coindex.createeddb.process({
            method: 'array.read',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
        })
        console.log('readObject', readObject)

        let updateObject = await Coindex.createeddb.process({
            method: 'array.update',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: { testArray: 'testArrayA' }
        })
        console.log('updateObject', updateObject)


        let deleteObject = await Coindex.createeddb.process({
            method: 'array.delete',
            database: ['testDatabase', 'testDatabase1', 'testDatabase2'],
            array: ['testArrayA', 'testArray1', 'testArray2']
        })
        console.log('deleteObject', deleteObject)

    }
}
