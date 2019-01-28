const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

var SplitDirectorySchema = new mongoose.Schema({

    fileName: {
        type: String,
        default: 'root'
    },
    folder: {
        type: Boolean,
        default: true
    },
    size: { type: Number },
    content: [this],
    parts: [
        {
            size: { type: String },

            locationId: { // id of account where chunk is located
                type: String
            },
            partId: {   // id of chunk in service's drive
                type: String
            }

        }
    ]

});

var splitDirectory = mongoose.model('splitDirectory', SplitDirectorySchema);

var sd = new splitDirectory({});

sd.save();