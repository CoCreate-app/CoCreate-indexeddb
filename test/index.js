function init() {
    if (!('indexedDB' in window)) {
        console.log("This browser doesn't support IndexedDB.");
        return;
    } else {
        runTest()
    }
}

async function runTest() {
    let data = await CoCreate.indexeddb.createDocument({
        database: 'testDB',
        collection: 'testCollection', 
        data: {
            name: 'test9'
        }
    })

    CoCreate.indexeddb.updateDocument({
        database: 'testDB',
        collection: 'testCollection',  
        data: {
            _id: data.data._id,
            'books.action.title': 'matr',
            sports: {basketball: {teams: ['lakers']}}
        }
        
    })
}

init();
