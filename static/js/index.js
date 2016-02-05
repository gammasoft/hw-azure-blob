$(function() {
    var $modal = $('#envioDeArquivoModal'),
        $progressBar = $modal.find('.progress-bar'),
        $fileInput = $modal.find('input[type="file"]'),
        $enviarArquivo = $modal.find('button#enviarArquivo');

    function setProgressBarValue(progress) {
        $progressBar
            .html(progress.toFixed(2).replace('.', ',') + '%')
            .attr('aria-valuenow', progress)
            .css('width', progress + '%');
    }

    $modal.on('shown.bs.hidden', function() {
        setProgressBarValue(0);
    });

    $fileInput.on('change', function(e) {
        if(!e.target.files.length) {
            return;
        }

        var file = e.target.files[0],
            get = $.getJSON('/upload-metadata', {
                fileName: file.name,
                contentLength: file.size
            });

        get.done(function(uploadMetadata) {
            var fileReader = new FileReader();
            fileReader.onload = function(e) {
                var ajax = $.ajax({
                    type: uploadMetadata.verb,
                    url: uploadMetadata.resource,
                    crossDomain: true,
                    data: e.target.result,
                    contentType: false,
                    processData: false,
                    beforeSend: function(req) {
                        req.setRequestHeader('Authorization', uploadMetadata.authorization);
                        req.setRequestHeader('Content-Type', uploadMetadata.contentType);

                        Object.keys(uploadMetadata.customHeaders).forEach(function(header) {
                            req.setRequestHeader(header, uploadMetadata.customHeaders[header]);
                        });
                    },
                    xhr: function() {
                        var myXhr = $.ajaxSettings.xhr();

                        if(myXhr.upload){
                            myXhr.upload.addEventListener('progress', function(e) {
                                if(e.lengthComputable) {
                                    setProgressBarValue(e.loaded / file.size * 100);
                                }
                            }, false);
                        }

                        return myXhr;
                    }
                });

                ajax.done(function() {
                    location.reload();
                });

                ajax.fail(function() {
                    alert('Something went wrong!');
                });
            };

            fileReader.readAsArrayBuffer(file);
        });

        get.fail(function() {
            alert('Something went wrong');
        });
    });
});