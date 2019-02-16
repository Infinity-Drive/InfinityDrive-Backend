var standarizeFileData = (items, accountType) => {
    
    var standarizedItems = [];

    if(accountType === 'gdrive'){
        
        items.forEach(item => {

            if (item.mimeType === 'application/vnd.google-apps.folder')
                item['mimeType'] = 'folder';
            
            standarizedItems.push(item);

        });

    }

    if(accountType === 'odrive'){
        
        items.forEach(item => {
            //item has a file property if its a file and a folder property if its a folder
            item.file != undefined ? item['mimeType'] = item.file.mimeType : item['mimeType'] = 'folder';
            //dont need to send back file object since we're sending the mime type
            delete item.file;
            standarizedItems.push(item);
        });

    }

    if(accountType === 'dropbox'){
        
        items.entries.forEach(item => {
            //item has a file property if its a file and a folder property if its a folder
            if(item['.tag'] === 'folder')
                item['mimeType'] = 'folder'
            else 
                item['mimeType'] = item.name.split('.')[1];
            //dont need to send back file object since we're sending the mime type
            
            standarizedItems.push({ id: item.id, name: item.name, mimeType: item['mimeType'] });
        });

    }

    return standarizedItems;
}

module.exports = { standarizeFileData }