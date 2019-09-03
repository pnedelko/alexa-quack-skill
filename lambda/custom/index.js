/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
'use strict';

const _ = require('lodash');
const Alexa = require('alexa-sdk');

const APP_ID = process.env.APP_ID;
const BUCKET = process.env.BUCKET;
const REGION = process.env.REGION;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Yellow Duck',
            WELCOME_MESSAGE: 'Welcome to %s. You can ask me, "what does a dog do" or "what does a cat say". ... Now, what would you like to ask me?',
            WELCOME_REPROMPT: 'For instructions on what you can say, please say "help me".',
            HELP_MESSAGE: 'You can ask me, "what does a dog do" or "what does a cat say". ... Now, what would you like to ask me?',
            HELP_REPROMPT: 'What would you like to ask me?',
            ITEM_NOT_FOUND_MESSAGE: 'I\'m sorry, I don\'t know it at the moment. Would you like to ask me something else?',
            ITEM_NOT_FOUND_REPROMPT: 'Would you like to ask me something else?'
        },
    },
    'de': {
        translation: {
            SKILL_NAME: 'Gelbe Ente',
            WELCOME_MESSAGE: 'Willkommen bei %s. Du kannst beispielsweise die Frage stellen: "Wie macht der Hund" oder "Wie klingt die Katze". ... Nun, was möchtest du fragen?',
            WELCOME_REPROMPT: 'Wenn du wissen möchtest, was du sagen kannst, sag einfach "Hilf mir".',
            HELP_MESSAGE: 'Du kannst beispielsweise die Frage stellen: "Wie macht der Hund" oder "Wie klingt die Katze". ... Nun, was möchtest du fragen?',
            HELP_REPROMPT: 'Was möchtest du fragen?',
            ITEM_NOT_FOUND_MESSAGE: 'Tut mir leid, ich kenne es nicht. Probier mal was anderes, bitte.',
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
    'PlayIntent': function () {
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
    'AMAZON.ResumeIntent': function () {
        console.log('Resuming...');

        const slotId = this.attributes.token;
        const offsetInMilliseconds = this.attributes.offsetInMilliseconds;

        console.log('Token:', slotId);
        console.log('Offset:', offsetInMilliseconds);

        const path = `https://s3.${REGION}.amazonaws.com/${BUCKET}/${slotId}.mp3`;
        console.log('File path:', path);

        this.response.audioPlayerPlay('REPLACE_ALL', path, slotId, null, offsetInMilliseconds);
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
    },

    'PlaybackStarted': function () {
        console.log('PlaybackStarted event received');
        this.attributes.token = this.event.request.token;
        this.attributes.offsetInMilliseconds = this.event.request.offsetInMilliseconds;
        this.emit(':saveState', true);
    },
    'PlaybackFinished': function () {
        console.log('PlaybackFinished event received');
    },
    'PlaybackStopped': function () {
        console.log('PlaybackStopped event received');
        this.attributes.token = this.event.request.token;
        this.attributes.offsetInMilliseconds = this.event.request.offsetInMilliseconds;
        this.emit(':saveState', true);
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.dynamoDBTableName = DYNAMODB_TABLE_NAME;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);

    alexa.execute();
};
