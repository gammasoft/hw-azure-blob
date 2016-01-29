'use strict';

var express = require('express'),
    bodyParser = require('body-parser'),
    moment = require('moment'),
    gammautils = require('gammautils'),
    mime = require('mime'),
    azure = require('azure-storage'),
    azureSignature = require('azure-signature'),
    Blob = azureSignature.resources.Blob,

    azureApiVersion = '2015-02-21',
    azureContainer = '',
    azureAccountName = '',
    azureAccessKey = '',
    azureConnectionString = 'DefaultEndpointsProtocol=https;AccountName=' + azureAccountName + ';AccountKey=' + azureAccessKey + ';BlobEndpoint=https://' + azureAccountName + '.blob.core.windows.net/;',
    blobService = azure.createBlobService(azureConnectionString),
    app = express();

app.set('view engine', 'jade');
app.use(express.static('static'));

app.get('/upload-metadata', function(req, res, next) {
    var fileName = req.query.fileName,
        blob = new Blob(azureAccountName, azureContainer, fileName),
        request = {
            verb: 'PUT',
            resource: blob,
            contentLength: req.query.contentLength,
            contentType: mime.lookup(fileName),
            customHeaders: {
                'x-ms-date': new Date().toGMTString(),
                'x-ms-version': azureApiVersion,
                'x-ms-blob-type': 'BlockBlob'
            }
        };

    request.authorization = 'SharedKey ' + [
        azureAccountName,
        azureSignature.calculate(request, azureAccessKey)
    ].join(':');

    res.json(request);
});

app.get('/', function(req, res, next) {
    blobService.listBlobsSegmented(azureContainer, null, function(err, result, response){
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
            container: azureContainer
        });
    });
});

app.get('/:blob', function(req, res, next) {
    var blob = req.params.blob,
        signature = blobService.generateSharedAccessSignature(azureContainer, blob, {
            AccessPolicy: {
                Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
                Start: new moment().utc().subtract(2, 'minutes').toDate(),
                Expiry: new moment().utc().add(2, 'minutes').toDate()
            }
        });

    res.redirect(blobService.getUrl(azureContainer, blob, signature));
});

app.delete('/:blob', function(req, res, next) {
    var blob = req.params.blob;

    blobService.deleteBlob(containerName, 'myblob', function(err) {
        if(err) {
            return next(err);
        }

        res.redirect('/');
    });
});

app.listen(9898);
