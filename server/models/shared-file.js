const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

var SharedFileSchema = new mongoose.Schema({

    fileName: {
        type: String,
    },
    fileType: {
        type: String
    },
    split: {
        type: Boolean,
        default: false
    },
    size: { type: String },
    locationId: { type: String }, // id of account where chunk is located
    partId: { type: String }, // id of chunk in service's drive
    parts: [this],
    sharableId: { type: String }

});