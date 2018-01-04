/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
'use strict';

const _ = require('lodash');
const Alexa = require('alexa-sdk');

const APP_ID = process.env.APP_ID;
const BUCKET = process.env.BUCKET;
const REGION = process.env.REGION;

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Yellow duck',
            WELCOME_MESSAGE: 'Welcome to %s. You can ask me, how does a horse do? ... Now, what can I help you with?',
            WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
            HELP_MESSAGE: 'You can ask questions such as, how does a horse do, or, you can say exit...Now, what can I help you with?',
            HELP_REPROMPT: 'Now, what can I help you with?',
            ITEM_NOT_FOUND_MESSAGE: 'I\'m sorry, I don\'t know it at the moment.',
            ITEM_NOT_FOUND_REPROMPT: 'Try something else.'
        },
    },
    'de': {
        translation: {
            SKILL_NAME: 'Gelbe Ente',
            WELCOME_MESSAGE: 'Willkommen bei %s. Du kannst beispielsweise die Frage stellen: Wie macht der Hund? ... Nun, womit kann ich dir helfen?',
            WELCOME_REPROMPT: 'Wenn du wissen möchtest, was du sagen kannst, sag einfach "Hilf mir".',
            HELP_MESSAGE: 'Du kannst beispielsweise Fragen stellen wie "Wie macht der Hund". ... Wie kann ich dir helfen?',
            HELP_REPROMPT: 'Wie kann ich dir helfen?',
            ITEM_NOT_FOUND_MESSAGE: 'Tut mir leid, ich kenne es nicht.',
            ITEM_NOT_FOUND_REPROMPT: 'Probier mal was anderes.'
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');

        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'PlayIntent': function() {
        const intent = this.event.request.intent;
        const itemSlot = _.get(intent, 'slots.Item', {});
        console.log('Item slot: %j', itemSlot);

        const itemValue = _.get(itemSlot, 'value');
        const slotId = _.get(itemSlot, 'resolutions.resolutionsPerAuthority.0.values.0.value.id');

        if (!slotId) {
            const speechOutput = this.t('ITEM_NOT_FOUND_MESSAGE');
            const repromptSpeech = this.t('ITEM_NOT_FOUND_REPROMPT');

            this.attributes.speechOutput = speechOutput;
            this.attributes.repromptSpeech = repromptSpeech;
            this.response.speak(speechOutput).listen(repromptSpeech);
            this.emit(':responseReady');
            return;
        }

        const path = `https://s3.${REGION}.amazonaws.com/${BUCKET}/${slotId}.mp3`;

        console.log('File path:', path);

        this.response
            .speak(itemValue)
            .audioPlayerPlay('REPLACE_ALL', path, slotId, null, 0);
        this.emit(':responseReady');
    },
    'AMAZON.PauseIntent': function () {
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.CancelIntent': function () {
        this.emit('AMAZON.StopIntent');
    },
    'AMAZON.StopIntent': function () {
        this.response.audioPlayerStop();
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    },
    'Unhandled': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
    }
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);

    alexa.execute();
};
