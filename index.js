app.get('/webhook', (req,res)=>{
 if(req.query['hub.verify_token']=='oscar123'){
   res.send(req.query['hub.challenge']);
 } else {
   res.sendStatus(403);
 }
});
