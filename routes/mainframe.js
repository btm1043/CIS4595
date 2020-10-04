var express = require('express');
var path = require('path');
const fs = require('fs');
var crypto=require('crypto');

var router = express.Router();


router.get('/',async(req,res,next)=>{
    try{
		console.log(req.ip);
		if(req.session.userstat!=1){
			req.session.userstat=0;
			req.session.username="";
		}else{
			req.session.userstat=1;
		}
		console.log(req.session.userstat);
		res.render(path.join('./mainframe/homepage'),{loggedin:req.session.userstat,username:req.session.username});

    }catch (e){
        next(e);
    }
    
});

router.post('/authenticate',async(req, res,next)=> {
	try{
	req.session.username = req.body.username;
	req.session.userstat=1;
	res.redirect('../');		
	}catch (e){
		next(e);
	}
});

module.exports = router;