const { Player, Enderman } = require('../models/eman.js')
const router = require("express").Router()
const express = require("express")
const fetch = require('node-fetch')

router.post('/eman/createuser', createUser, async (req, res) => {
    return res.status(418).json({success: false, error: 418, message: "There is almost no way that you should be reading this message. If you are, something has gone seriously wrong. You should probably open an issue on https://github.com/carreb/api.domyjobfor.me/issues", whatAmI: "a teapot!!"})
})

router.get("/eman", parseEmanQuery, getUuidFromName, populateEmanBosses, async (req, res) => {
    let p = res.player
    // calculate averages
    let average_magic_find = 0
    let average_kill_time = 0
    let average_spawn_time = 0
    let total_core_drops = 0
    let total_tracked_kills = 0
    let count = 0
    p.bosses.forEach((boss) => {
        average_magic_find += boss.magicFind
        average_kill_time += boss.timeToKill
        average_spawn_time += boss.timeToSpawn
        if (boss.drops.includes("Judgement Core")) {
            total_core_drops++
        }
        if (boss.status == "killed") {
            total_tracked_kills++
        }

        count++
    })
    average_magic_find = (average_magic_find / count).toFixed(2)
    average_kill_time = Math.floor(average_kill_time / count)
    average_spawn_time = Math.floor(average_spawn_time / count)
    average_success_chance = total_tracked_kills / count
    average_bosses_per_core = (total_core_drops / total_tracked_kills * 100).toFixed(2)

    //return values
    return res.status(200).json({
      success: true,
      uuid: p.uuid,
      stats: {
        total_core_drops: total_core_drops,
        average_bosses_per_core: `${average_bosses_per_core}%`,
        total_tracked_kills: total_tracked_kills,
        average_magic_find: average_magic_find,
        average_spawn_time: average_spawn_time,
        average_kill_time: average_kill_time,
        success_rate: `${(average_success_chance * 100).toFixed(2)}%`,
      },
      data: {
        bosses: p.bosses,
      },
    });
})

router.get("/eman/:id", async (req, res) => {
    let enderman = await Enderman.findById(req.params.id);
    return res.status(200).json(enderman)
})

router.post('/eman/postboss', async (req, res) => {
    let b = req.body
    const newEman = new Enderman({
      tier: b.tier,
      killerUuid: b.killerUuid,
      status: b.status,
      questStartedAt: b.questStartedAt,
      bossStartedAt: b.bossStartedAt,
      questEndedAt: b.questEndedAt,
      timeToSpawn: Math.floor((b.bossStartedAt - b.questStartedAt) / 1000),
      timeToKill: Math.floor((b.questEndedAt - b.bossStartedAt) / 1000),
      totalXp: b.totalXp,
      meterXp: b.meterXp,
      magicFind: b.magicFind,
      drops: b.drops
    });
    try {
        const player = await Player.findOne({ uuid: b.killerUuid })
        savedEman = await newEman.save()
        player.bosses.push(savedEman)
        player.save(() => {
            return res.status(201).json({ success: true, boss: newEman });
        })
    } catch(err) {
        return res.status(500).json({ success: false, error: 500, message: "An error occurred", details: err.message })
    }
})



// middleware

function isEmpty(obj) {
    return Object.keys(obj).length === 0
}

async function createUser(req, res, next) {
    console.log("Attempting to create user...")
    let uuid = req.body.uuid
    console.log(`uuid: ${uuid}`);
    try {
        let user = await Player.findOne({ uuid: uuid })
        if (user == null) {
            let validPlayer = await fetch(`https://playerdb.co/api/player/minecraft/${uuid}`)
            .then((response) => response.json())
            .then(async (data) => {
                if (data.code == "player.found") {
                    const newUser = new Player({
                        uuid: uuid
                    })
                    const createdUser = await newUser.save()
                    console.log("Returning 201 Created User")
                    let returnedInfo = {
                        success: true,
                        user: createdUser,
                        status: 201
                    }
                    return returnedInfo
                } else {
                    console.log("Ignoring request as uuid is not a valid minecraft account.")
                    let returnedInfo = {
                        success: false,
                        error: 400,
                        status: 400,
                        message: "Not a valid Minecraft player UUID. (or the service is down?)"
                    }
                    return returnedInfo
                }
            })
            return res.status(validPlayer.status).json(validPlayer)
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
            if (data.code == "player.found") {
                res.uuid = data["data"].player.raw_id
                console.log(res.uuid + " asda")
                return next()
            }
            return res.status(500).json({success: "false", error: 500, message: "An error occurred while getting that user's uuid. Either that player does not exist or the conversion service is down. Consider trying again by putting the uuid in as a query manually. When doing this, ensure that there are NO DASHES in the uuid."})
        })
    }
    else if (res.queries.uuid != undefined) {
        console.log(res.queries.uuid);
        res.uuid = res.queries.uuid;
        console.log(res.uuid);
        next();
    }
    else {
        return res.status(500).json({success: "false", error: 500, message: " i have no idea what happened, sorry :("})
    }
}

async function populateEmanBosses(req, res, next) {
    try {
        if (!res.uuid) {
            return res.status(500).json({success: "false", error: 500, message: "It seems that your uuid has been lost in translation between middleware processes. This is probably the fault of the server. (If this problem persists, open an issue at https://github.com/carreb/api.domyjobfor.me/issues)"})
        }
        Player.findOne({ uuid: res.uuid })
        .populate('bosses')
        .exec((err, player) => {
            if (err) return res.status(500).json({success: "false", error: 500, message: "The server ran into a problem while trying to populate your bosses.", details: err.message})
            res.player = player
            next()
        })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: 500, message: "An error occurred in the server", details: err.message })
    }
}


// export
module.exports = router