import { faker } from '@faker-js/faker';
import * as express from 'express';

// DATA
let access_tokens:{token:string,expire:Date,account:string}[] = [];
const accounts:{account:string,password:string}[] = [];
interface Pagination{
  page:number;
  size:number;
}
interface PaginationRequestModel{
  pagination?:Partial<Pagination>;
}
interface Article{
  title:string;
  id:number;
  content:string;
  author:string;
}
let articles:Article[] = [];
let article_amount:number = 0;
let MAX_ARTICLE_ID = 0
let auto_gen_articles = 10;

while(auto_gen_articles-- > 0){
  article_amount++;
  articles.push({
    id:auto_gen_articles,
    title:faker.lorem.text(),
    content:faker.lorem.paragraphs(5),
    author:`${faker.name.firstName()}${faker.name.lastName()}`
  })
  MAX_ARTICLE_ID++;
}



const app = express();
app.use(express.json())

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to auto-api-test!' });
});

const port = process.env.port || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
//Anonymous API
app.post('/api/register',(req:express.Request<any,any,{account:string,password:string}>,res)=>{
  let account = accounts.find(a=>a.account==req.body.account);
  if(account){res.status(409);res.send();return;}
  accounts.push(req.body);
  res.status(200);
  res.send();
  return;
})
app.post('/api/auth',(req:express.Request<any,any,{account:string,password:string}>,res)=>{
  let account = accounts.find(a=>a.account==req.body.account && a.password == req.body.password);
  if(account){
    let access_token =faker.datatype.hexadecimal(32);
    access_tokens.push({token:access_token,expire:(new Date(Date.now()+360000)),account:account.account})
    res.json({access_token})
    res.status(200);
    res.send();
  }
  res.status(400);
  res.send();
})
//Authorized API
const router = express.Router();
const auth:express.Handler = (req:express.Request<{access_token:string}>,res,next)=>{
  if(req.query.access_token){
    let session_token = access_tokens.find(a=>a.token == req.query.access_token);
    if(!session_token){
      res.send(400);
      return;
    }
    if(session_token.expire.getTime() > Date.now()){
      res.locals.user = session_token.account;
      next();
      return;
    }
    else{
      access_tokens = access_tokens.filter(a=>a.token != session_token.token);
      res.send(498)
    }
  }
  res.status(400);
  res.send()
}

router.get('/api/articles',auth,(req:express.Request<any,any,PaginationRequestModel>,res)=>{
  let pagination:Pagination = Object.assign({},<Pagination>{page:1,size:5},req.body.pagination);
  pagination.page-=1;
  if( pagination.page < 0 || pagination.size <= 0 || pagination.page * pagination.size >= article_amount){res.json([]);return;}
  let page_index = pagination.page * pagination.size;
  let paged_articles = articles.slice(page_index,page_index + pagination.size);
  res.json(paged_articles);
  return;
})
router.get('/api/articles/:id',auth,(req:express.Request<{id:string}>,res)=>{
  let article =articles.filter(a=>a.id == Number(req.params.id));
  if(article.length == 0){
    res.status(404);
  }
  res.json(article[0]);
})
router.post('/api/articles',auth,(req:express.Request<any,any,{article:Omit<Article,'id'|'author'>}>,res)=>{
  let article = req.body.article as Article;
  if(article == undefined || article.content == undefined || article.title == undefined){
    res.status(400);
    res.send({ message:'missing parts'});
    return;
  }
  article.author = res.locals.user;
  article.id = MAX_ARTICLE_ID++;
  articles.push(article);
  res.send({message:'success',article})
})
router.put('/api/articles/:id',auth,(req:express.Request<any,any,{article:Article}>,res)=>{
  articles = articles.filter(a=>a.id != Number(req.params.id));
  articles.push(req.body.article);
  res.send({message:'success'})
})
router.delete('/api/articles/:id',auth,(req:express.Request,res)=>{
  articles = articles.filter(a=>a.id != Number(req.params.id));
  res.send({message:'success'})
})


app.use(router);

server.on('error', console.error);

