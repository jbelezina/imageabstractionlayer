'use strict'

let express = require ('express'),
    bodyparser = require('body-parser'),
    axios = require('axios'),
    mongoose = require('mongoose'),
    secrets = require('./secrets'),
    homeControler = require('./controlers/home.controler.js'),
    portNo = 8080,
    searchqueries = [],
    app = express();

mongoose.connect(secrets.jansDbUri);
app.use(bodyparser.urlencoded({ extended: false }));

// MONGO SETUP =================================================================
//==============================================================================

let db = mongoose.connection;

let querySchema = mongoose.Schema({
    term: String,
    when: Date
});

let queryModel = mongoose.model('queryModel', querySchema);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('we\'re connected!');

// ROUTES ======================================================================
//==============================================================================

app.get('/', homeControler.home);

app.get('/:searchquery', (req,res) => {
    
    let searchquery = req.params.searchquery,
        queryUrlEncoded = encodeURI(searchquery),
        timestamp = Date().toString(),
        showPage = req.query.offset,
        startIndex = 1;
    
/* making sure results start from the right result index based on offset param
passed in (e.g. if offset is 2, the first result should have the index of 21) */
    
    if (showPage) {
        startIndex += (parseInt(showPage) * 10) 
    } 

// save query in Mongo to enable showing latest queries

    if (searchquery !== "favicon.ico"){
        
        var newQuery = new queryModel({ 
            'term' : searchquery,
            'when' : timestamp
        });
        
        newQuery.save(function (err, newQuery) {
            if (err) return console.error(err);
            console.log('new DB entry created:' + newQuery);
        });
        
    }
    
// get the results

    axios.get('https://www.googleapis.com/customsearch/v1?key=' + secrets.jansKey + '&start='
    + startIndex + '&cx=' + secrets.jansCx + '&q=' 
    + queryUrlEncoded + '&fileType=jpg&fields=items')
        .then(function (response) {
            
            console.log(response);
            
            let jsonItems = JSON.parse(JSON.stringify(response.data.items));
            let arrayOfresults = [];
            if (jsonItems.length < 10) {
                arrayOfresults.unshift({'Next page available' : 'false'})
            } 
            
            for (let i = 0; i < jsonItems.length; i++) {
                
                let thumbnailUrl = jsonItems[i].pagemap['cse_thumbnail'][0].src;
                let formattedResult = {}
                formattedResult.url = jsonItems[i].link;
                formattedResult.snippet = jsonItems[i].snippet;
                formattedResult.thumbnail = thumbnailUrl;
                formattedResult.context = jsonItems[i].displayLink;
                
                arrayOfresults.push(formattedResult)
            }
                
            res.json(JSON.parse(JSON.stringify(arrayOfresults)));
        })
        .catch(function (error) {
            res.json({
                error: "sorry, no results found"    
            });
        });
});

app.get('/api/latest/imagesearch/', (req,res) => {
   
    queryModel.find({}).sort('-date').limit(10).exec(function(err, queries){
    
        if(err){
        console.log(err);
            res.json({
                'error':'Sorry, latest entries could not be retrieved'
            })
        }

        let results = [];
        
        for (let i = 0 ; i < queries.length ; i++) {
            
            let eachEntry = {};
            eachEntry.term = queries[i].term;
            eachEntry.when = queries[i].when;
            results.unshift(eachEntry);
        }
        
        res.json(JSON.parse(JSON.stringify(results)));
    });
   
});    
    
}); // end of db.once


// SERVER ======================================================================
//==============================================================================

app.listen(portNo, function(){
    console.log('server listeninig on port ' + portNo);
} )