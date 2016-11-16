'use strict'

module.exports.home = (req,res) => {
    res.json(JSON.parse(JSON.stringify(/*global searchqueries*/)));
};