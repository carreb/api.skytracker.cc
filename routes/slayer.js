const { Player, Enderman } = require('../models/eman.js')
const router = require("express").Router()
const express = require("express")
const fetch = require('node-fetch')

router.post('/eman/createuser', createUser, async (req, res) => {
    return res.status(418).json({success: false, error: 418, message: "There is almost no way that you should be reading this message. If you are, something has gone seriously wrong. You should probably open an issue on https://github.com/carreb/api.domyjobfor.me/issues", whatAmI: "a teapot!!"})
})

router.get("/eman", parseEmanQuery, getUuidFromName, populateEmanBosses, async (req, res) => {
    return res.status(200).json({success: true, data: res.player})
})







// middleware

function isEmpty(obj) {
    return Object.keys(obj).length === 0
}

async function createUser(req, res, next) {
    let uuid = req.body.uuid
    try {
        let user = await Player.find({ uuid: uuid })
        if (user == null) {
            const newUser = new Player({
                uuid: uuid
            })
            const createdUser = await newUser.save()
            return res.status(204).json(createdUser)
        }
        return res.status(400).json({success: false, error: 400, message: "That player already exists."})
    }
    catch(err) {
        return res.status(500).json({success: "false", error: 500, message: err.message})
    }
}

async function parseEmanQuery(req, res, next) {
    const q = req.query;
    if (isEmpty(q)) {
        // if there are no queries, return a 400 bad request error
        return res.status(400).json({success: "false", error: 400, message: "No queries were provided"})
    }
    let queryBuilder = {
        name: q.name,
        uuid: q.uuid
    }
    // remove any query keys that are not defined by the user
    Object.keys(queryBuilder).forEach(key => queryBuilder[key] === undefined ? delete queryBuilder[key] : {});
    res.queries = queryBuilder
    next()
}

async function getUuidFromName(req, res, next) {
    if (res.queries.name != undefined) {
        fetch(`https://playerdb.co/api/player/minecraft/${res.queries.name}`)
        .then(res => res.json())
        .then(data => {
            if (code == "player.found") {
                res.uuid = data["data"].raw_id
                next()
            }
            return res.status(500).json({success: "false", error: 500, message: "An error occurred while getting that user's uuid. Either that player does not exist or the conversion service is down. Consider trying again by putting the uuid in as a query manually. When doing this, ensure that there are NO DASHES in the uuid."})
        })
    }
    next()
}

async function populateEmanBosses(req, res, next) {
    if (!res.uuid) {
        return res.status(500).json({success: "false", error: 500, message: "It seems that your uuid has been lost in translation between middleware processes. This is probably the fault of the server. (If this problem persists, open an issue at https://github.com/carreb/api.domyjobfor.me/issues)"})
    }
    Player.findOne({ uuid: res.uuid })
    .populate('bosses')
    .exec((err, player) => {
        if (err) return res.status(500).json({success: "false", error: 500, message: "The server ran into a problem while trying to populate your bosses.", details: err})
        res.player = player
    })
}


// export
module.exports = router