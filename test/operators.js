function createUpdate(update, data, globalOpertors) {
    let operatorKeys = {}
    if (globalOpertors)
        operatorKeys = { ...globalOpertors }

    Object.keys(data).forEach(key => {
        if (key === '_id')
            return

        if (key.startsWith('$')) {
            if (!key.includes('.'))
                for (let oldkey of Object.keys(data[key]))
                    operatorKeys[key + '.' + oldkey] = data[key][oldkey]
            else
                operatorKeys[key] = data[key]
        } else if (typeof data[key] === 'string' && data[key].startsWith('$')) {
            operatorKeys[data[key] + '.' + key] = data[key]
        } else if (key.endsWith(']')) {
            const regex = /^(.*(?:\[\d+\].*?)?)\[(.*?)\](?:\[\])?$/;
            const match = key.match(regex);
            if (match[2] === '')
                operatorKeys['$push.' + match[1]] = data[key]
            else {
                let index = parseInt(match[2], 10);
                if (index === NaN)
                    operatorKeys[match[2] + '.' + match[1]] = data[key]
                else
                    operatorKeys[key] = data[key]
            }
        } else if (key.includes('.')) {
            operatorKeys[key] = data[key]
        } else if (data[key] === undefined) {
            delete update[key]
        } else
            update[key] = data[key]

    })

    return dotNotationToObjectUpdate(operatorKeys, update)
}

function dotNotationToObjectUpdate(data, object = {}) {
    try {
        for (const key of Object.keys(data)) {
            let value = data[key]
            let newObject = object
            let oldObject = new Object(newObject)
            let keys = key.replace(/\[(\d+)\]/g, '.$1').split('.');

            if (keys[0].startsWith('$'))
                var operator = keys.shift()

            let length = keys.length - 1
            for (let i = 0; i < keys.length; i++) {
                if (/^\d+$/.test(keys[i]))
                    keys[i] = parseInt(keys[i]);

                if (length == i) {
                    // TODO: operator updates
                    if (operator) {
                        if (operator === '$rename') {
                            newObject[value] = newObject[keys[i]]
                            delete newObject[keys[i]]
                        } else if (operator === '$delete' || operator === '$unset' || operator === '$slice') {
                            if (typeof keys[i] === 'number')
                                newObject.slice(keys[i], 1);
                            else
                                delete newObject[keys[i]]
                        } else if (operator === '$shift') {
                            newObject[keys[i]].shift();
                        } else if (operator === '$pop') {
                            newObject[keys[i]].pop();
                        } else if (operator === '$addToSet' || operator === '$pull') {
                            // find matching items and update or delete
                            key = arrayKey
                            updates[key] = data[originalKey]
                        } else if (operator === '$push' || operator === '$splice') {
                            // TODO: support pushing an array as values
                            if (typeof keys[i] === 'number' && newObject.length >= keys[i])
                                newObject.splice(keys[i], 0, value);
                            else
                                newObject[keys[i]].push(value);
                        } else if (operator === '$inc') {
                            newObject[keys[i]] += value
                        }
                    } else if (value === undefined) {
                        if (typeof keys[i] === 'number')
                            newObject.slice(keys[i], 1);
                        else
                            delete newObject[keys[i]]
                    } else
                        newObject[keys[i]] = value;
                } else {
                    newObject[keys[i]] = oldObject[keys[i]] || {};
                    newObject = newObject[keys[i]]
                    oldObject = oldObject[keys[i]]
                }
            }
        }
        return object
    } catch (error) {
        console.log("Error converting dot notation to object", error);
        return false;
    }
}
