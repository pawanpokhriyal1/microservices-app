const Joi=require('joi')

const validateRegistration=(data)=>{
    const schema=Joi.object({
        username:Joi.string().min(3).max(50).required(),
        email:Joi.string().email().required(),
        password:Joi.string().min(6).required()
    },{abortEarly:false})

    return schema.validate(data,{abortEarly:false});
}
const validateLogin=(data)=>{
    const schema=Joi.object({
        email:Joi.string().email().required(),
        password:Joi.string().min(6).required()
    },{abortEarly:false})

    return schema.validate(data,{abortEarly:false});
}
module.exports={validateRegistration,validateLogin};