'use strict';

function initEnv(env) {
    var details = env.connectionString.match(/AccountName=(.*?(?=;));AccountKey=(.*?(?=;))/);
    env.account = details[1];
    env.accessKey = details[2];

    return env;
}

var express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    moment = require('moment'),
    gammautils = require('gammautils'),
    mime = require('mime'),
    azure = require('azure-storage'),
    azureSignature = require('azure-signature'),
    Blob = azureSignature.resources.Blob;

var env = initEnv(require('./env.json')),
    HTTP_PORT = process.env.HTTP_PORT || 9898,
    blobService = azure.createBlobService(env.connectionString),
    app = express();

app.set('view engine', 'jade');
app.use(express.static('static'));
app.use(methodOverride('_method'));

app.get('/upload-metadata', function(req, res, next) {
    var fileName = req.query.fileName,
        blob = new Blob(env.account, env.container, fileName),
        request = {
            verb: 'PUT',
            resource: blob,
            contentLength: req.query.contentLength,
            contentType: mime.lookup(fileName),
            customHeaders: {
                'x-ms-date': new Date().toGMTString(),
                'x-ms-version': '2015-02-21',
                'x-ms-blob-type': 'BlockBlob'
            }
        };

    request.authorization = 'SharedKey ' + [
        env.account,
        azureSignature.calculate(request, env.accessKey)
    ].join(':');

    res.json(request);
});

app.get('/', function(req, res, next) {
    var prefix = req.query.prefix;

    blobService.listBlobsSegmentedWithPrefix(env.container, prefix, null, function(err, result, response){
        if(err){
            return next(err)
        }

        if(response.statusCode !== 200) {
            return next(new Error('Resposta esperada era 200'));
        }

        res.render('index', {
            blobs: result.entries,
            formatFileSize: gammautils.string.formatFileSize,
            moment: moment,
            container: env.container
        });
    });
});

app.get('/:blob', function(req, res, next) {
    var blob = req.params.blob,
        signature = blobService.generateSharedAccessSignature(env.container, blob, {
            AccessPolicy: {
                Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
                Start: new moment().utc().subtract(2, 'minutes').toDate(),
                Expiry: new moment().utc().add(2, 'minutes').toDate()
            }
        });

    res.redirect(blobService.getUrl(env.container, blob, signature));
});

app.delete('/:blob', function(req, res, next) {
    var blob = req.params.blob;

    blobService.deleteBlob(env.container, blob, function(err) {
        if(err) {
            return next(err);
        }

        res.redirect('/');
    });
});

app.listen(HTTP_PORT, function() {
    console.log('MS Azure Blog Storage Examples - Listening on port', HTTP_PORT);
});
