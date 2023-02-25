const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true
    },
    bosses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enderman'
    }]
})

const EndermanSchema = new mongoose.Schema({
    tier: {
        type: Number,
        min: 1,
        max: 4,
        required: true
    },
    killerUuid: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["killed", "failed"],
        required: true,
    },
    questStartedAt: {
        type: Date,
        required: true
    },
    bossStartedAt: {
        type: Date,
        required: true
    },
    questEndedAt: {
        type: Date,
        required: true
    },
    timeToSpawn: {
        type: Number,
        required: true,
    },
    timeToKill: {
        type: Number,
        required: true
    },
    totalXp: {
        type: Number,
        required: true
    },
    meterXp: {
        type: Number,
        required: true
    },
    magicFind: {
        type: Number,
        required: true
    },
    drops: {
        type: Array,
        required: true
    }
})

const Player = mongoose.model("Player", PlayerSchema)
const Enderman = mongoose.model("Enderman", EndermanSchema) 

module.exports = {
    Player,
    Enderman
}