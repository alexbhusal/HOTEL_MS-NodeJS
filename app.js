const express = require('express');
const expressHBS = require('express-handlebars');
const session= require('express-session')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const morgan = require('morgan');
const app = express();
app.use(morgan('dev'));
const { body, validationResult } = require('express-validator');
const validator = require('validator');
const port= 1111;

const hbs = expressHBS.create({
    extname:'hbs',
    defaultLayout:'main.hbs',
    layoutsDir:"views/layouts/",
    partialsDir:"views/partials/"
  });

app.engine('hbs',hbs.engine);
app.set('view engine','hbs');
app.use("/static",express.static(__dirname+ "/public"));
app.use("/statics",express.static(__dirname+ "/public/Images"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//To connect database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',  
    password: '',  
    database: 'hotel'
  });
  connection.connect((error) => {
    if (!error) {
      console.log('Connected to database');
      return;
    }else{
      console.error('Error connecting to database: ', error);
    }  
  });
  //get route
  app.get('/',(req,res,next)=>{
    res.render('pages/home');
  })
  app.get('/menu',(req,res,next)=>{
    res.render('pages/menu');
  }); 
  app.get('/booking',(req,res,next)=>{
    res.render('pages/booking');
  }); 
  app.get('/blog',(req,res,next)=>{
    res.render('pages/blogs');
  }); 
  app.get('/viewroom',(req,res,next)=>{
    res.render('pages/rooms');
  }); 
  app.get('/rooms',(req,res)=>{
    res.render('rooms/room')
  })
  app.get('/contact',(req,res,next)=>{
    res.render('pages/contact');
  }); 
  app.get('/login',(req,res,next)=>{
    res.render('admin/login');
  }); 
  app.get('/blog1',(req,res,next)=>{
    res.render('blogs/blog1');
  }); 
  app.get('/admin/contact_us',(req,res)=>{
    const query='SELECT* FROM `contact_us`';
    connection.query(query,(err,results)=>{
    if(err) throw err;
    res.render('admin/request',{feedback:results});
  });
  });
  app.get('/admin/booked',(req,res)=>{
    const query='SELECT* FROM booking';
    connection.query(query,(err,results)=>{
        if(err) throw err;
        res.render('admin/booked',{booked:results});
    });
  });
  
app.get('/confirmed', (req, res) => {
  const query = 'SELECT id FROM booking ORDER BY id DESC LIMIT 1'; // Assuming 'id' is the column name for booking ID
  connection.query(query, (error, results, fields) => {
    if (error) throw error;

    // Assuming there's only one booking ID
    const bookingID = results.length > 0 ? results[0].id : 'No booking ID found';
    res.render('pages/confirmed', { bookingID }); // Pass bookingId to the rendering function
  });
});
  app.get('*',(req,res)=>{
    res.send('<h1>Bhai yaha kuch nahi hey</h1>');
  });

    //post route
    app.post('/booking', [
      // Validate fields using express-validator
      body('first').notEmpty().withMessage('First name is required').custom((value) => {
          if (!validator.isAlpha(value)) {
              throw new Error('First name must contain only letters');
          }
          return true;
      }),
      body('middle').custom((value) => {
          if (!validator.isEmpty(value) && !validator.isAlpha(value)) {
              throw new Error('Middle name must contain only letters');
          }
          return true;
      }),
      body('last').notEmpty().withMessage('Last name is required').custom((value) => {
          if (!validator.isAlpha(value)) {
              throw new Error('Last name must contain only letters');
          }
          return true;
      }),
      body('street').notEmpty().withMessage('Street is required'),
      body('city').notEmpty().withMessage('City is required'),
      body('state').notEmpty().withMessage('State is required'),
      body('country').notEmpty().withMessage('Country is required'),
      body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email'),
      body('phone').notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
      body('check_in').notEmpty().withMessage('Check-in date is required').isISO8601().withMessage('Invalid date format'),
      body('check_out').notEmpty().withMessage('Check-out date is required').isISO8601().withMessage('Invalid date format'),
      body('room_type').notEmpty().withMessage('Room type is required'),
      body('room_number').notEmpty().withMessage('Room number is required'),
      // Add validation rules for other fields as needed
  ], (req, res) => {
      const errors = validationResult(req);
  
      if (!errors.isEmpty()) {
          // If there are validation errors, render the booking page with errors
          return res.render('pages/booking', { errors: errors.array() });
      }
      const { first, middle, last, street, city, state, postal, country, email, phone, check_in, check_out, room_type, room_number, special } = req.body;
  
      const availabilityQuery = 'SELECT * FROM booking WHERE room_number = ? AND ((check_in BETWEEN ? AND ?) OR (check_out BETWEEN ? AND ?))';
      const availabilityValues = [room_number, check_in, check_out, check_in, check_out];
  
      connection.query(availabilityQuery, availabilityValues, (availabilityError, availabilityResults, availabilityFields) => {
          if (availabilityError) {
              console.error('Error checking room availability', availabilityError);
              res.status(500).send('Error checking room availability');
              return;
          }
  
          if (availabilityResults.length > 0) {
            res.render('pages/alreadybooked');
              return;
          }
  
          // If room is available, proceed with the booking
          const bookingQuery = 'INSERT INTO booking (first, middle, last, street, city, state, postal, country, email, phone, check_in, check_out, room_type, room_number, special) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          const bookingValues = [first, middle, last, street, city, state, postal, country, email, phone, check_in, check_out, room_type, room_number, special];
  
          connection.query(bookingQuery, bookingValues, (bookingError, bookingResults, bookingFields) => {
              if (bookingError) {
                  console.error('Error occur during booking', bookingError);
                  res.status(500).send('Error occur during booking');
                  return;
              }
              res.redirect('/confirmed');
          });
      });
  });
    app.post('/contact',(req,res)=>{
        const{name,email,subject,message}=req.body;
        const query = 'INSERT INTO `contact_us`(name,email,subject,message) VALUES (?,?,?,?)';
        const value=[name,email,subject,message];
        connection.query(query,value,(error,results,fields)=>{
            if(!error){
                res.redirect('/')
            }else{
                console.log('error during submit contact page',error);
            }
        })
    });
    app.post('/login',(req,res)=>{
      const{username,password}= req.body;
      if(username==='aman' && password==='aman'){
        res.render('admin/admin-dashboard');
      }
      else{
        res.send('incorrect username & password');
      }

    });

app.listen(port,()=>{
    console.log(`http://localhost:${port}`);
});