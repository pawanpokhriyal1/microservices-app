const Joi=require('joi')

const validateCreatePost=(data)=>{
    const schema=Joi.object({
        content:Joi.string().min(3).max(500).required(),
        mediaIds:Joi.array(),
    },{abortEarly:false})

    return schema.validate(data,{abortEarly:false});
}

module.exports={validateCreatePost};