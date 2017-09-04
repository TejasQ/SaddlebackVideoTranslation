// TODO: the adjustment of font size is not working with the addresses of scriptures in the Scripture template but it should. +bug id:100 gh:44

{
    try {
        importScript('errors/runtime-error');
        importScript('errors/font-to-small-error');
        importScript('handle-items-and-folders/check-line-nums-in-template');
        importScript('adjust-layers/split-text-into-layers');

    } catch (e) {
        throw new sbVideoScript.RuntimeError({
            func: "importScript's for checkAndAdjustFontSize",
            title: 'Error loading neccesary functions',
            message: e.message
        })
    }

    sbVideoScript.checkAndAdjustFontSize = function (text, textLayer, originalLayerName, textIsSplittable, templateCompName) {
        try {
            var textProp = textLayer.property("Source Text");
            var textDocument = textProp.value;

            // saving some data to make sure the fontSize doesn't get to small
            // and placing the mask and line for the fill ins is possible
            var oldLinePosition = textDocument.baselineLocs[1];
            var oldFontSize = textDocument.fontSize;

            var cfgTextLayer = sbVideoScript.checkLineNumsInTemplate(templateCompName, textLayer, originalLayerName);
            var numLines = cfgTextLayer.numLines;
            var heightOfLines = cfgTextLayer.heightOfLines;

            // extend the text field by one line
            // which will help us to resize the font if the text doesn't fit
            textDocument.boxTextSize = [textDocument.boxTextSize[0], textDocument.boxTextSize[1] + heightOfLines];
            textProp.setValue(textDocument);

            // now we change the text for the first time
            // this is to check the size of the text and reducing
            // the fontSize if needed
            textProp.setValue(text);

            // check if text is too long for the text field and
            // adjust fontSize until it fits
            textDocument = textProp.value;
            var newFontSize = oldFontSize;
            var maxFontSizeChange = sbVideoScript.settings.maximumFontSizeChange;

            // TODO: find a way to make these checks faster (reduce fontSize to fit text into layer). The call textProp.setValue(textDocument) is very slow. +enhancement id:101 gh:45
            while (textDocument.baselineLocs.length > numLines * 4) {
                newFontSize -= 1;
                var fontSizeChange = newFontSize / oldFontSize - 1;

                // if fontSizeChange is to high than stop and try to split the layers
                // or return an empty array
                // an empty array means we were not succesfull to put the text into the layer
                if (fontSizeChange < maxFontSizeChange) {
                    if (textIsSplittable) {
                        // we can split the text in the layers for this comp
                        // but first we reset to a moderate fontSize
                        textDocument.fontSize = oldFontSize * (maxFontSizeChange / 2 + 1);
                        textProp.setValue(textDocument);

                        var splittedLayers = sbVideoScript.splitTextIntoLayers(text, textLayer, originalLayerName, numLines);
                        return splittedLayers;
                    } else {
                        throw new sbVideoScript.FontToSmallError(text, textLayer.name, templateCompName);
                    }
                }
                textDocument.fontSize = newFontSize;
                textProp.setValue(textDocument);
                textDocument = textProp.value;
            }
            return [text];

        } catch (e) {
            if (e instanceof sbVideoScript.FontToSmallError) {
                throw e;
            }

            var layerInfo = "";
            try {
                layerInfo += "textLayerName = "+ textLayer.name;
                if (text.length > 30) {
                    var textAry = text.split(' ');
                    text = "";
                    for (var i = 0; i < textAry.length; i++) {
                        if (text.length + textAry[i].length > 30) {
                            text += '...';
                            break;
                        }
                        text += ' ' + textAry[i];
                    }
                }
                layerInfo += "; text = "+ text;
                layerInfo = '[layer information: '+ layerInfo +']';
            } catch (e) {
                layerInfo = "["+ layerInfo +"; wasn't able to retrieve layer information]";
            }

            throw new sbVideoScript.RuntimeError({
                func: 'checkAndAdjustFontSize',
                title: 'Error adjusting font size to fit the text into the layer '+ layerInfo,
                message: e.message
            })
        }
    }
}
