export const find = async  ({
    model,
    filter={},
    select="",
    populate=[]

}={})=>{
    return await model.find(filter).select(select).populate(populate)
}




export const findOne = async ({
   model,
    filter={},
    select="",
    populate=[]

}={}) => {
    return await model.findOne(filter).select(select).populate(populate)
}



export const updateOne = async ({
    model,
    filter={},
    data={},
    options={runValidators:true}

}={}) => {
    return await model.updateOne(filter,data,options)
}



export const findByIdAndUpdate = async ({
    model,
    id ="",
    data ={},
    options ={new:true}

}={}) => {
    return await model.findByIdAndUpdate(id,data,options)
}



export const create = async ({
    model,
    data =[{}],
    options={validateBeforeSave:true}

}={}) => {
    return await model.create(data,options)
}


export const findById = async ({
    model,
    id="",
    select="",
    populate=[]

}={}) => {
    return await model.findById(id)
}


// export const updateOne = async({
//     model,
//     data = {},
//     options = {runValidators:true},
//     filter = {}
// } = {})=>{
//     return await model.updateOne(filter , data , options)
// }




// export const findOne = async({
//     model,
//     select = '',
//     populate = [],
//     filter = {}
// } = {})=>{
//     return await model.findOne(filter).select(select).populate(populate)
// }

// export const find= async({
//     model,
//     select = '',
//     populate = [],
//     filter = {}
// } = {})=>{
//     return await model.find(filter).select(select).populate(populate)
// }


// export const findById = async({
//     model,
//     id = '',
//      select = '',
//     populate = [],

// } = {})=>{
//     return await model.findById(id).select(select).populate(populate)
// }



// export const create = async({
//     model,
//     data = [{}],
//     options = {validateBeforeSave:true}
// } = {})=>{
//     return await model.create(data, options)
// }



// export const findByIdAndUpdate = async({
//     model,
//     data = {},
//     options = {new:true},
//     id = ""
// } = {})=>{
//     return await model.updateOne(  data , options , id)
// }





export const findOneAndUpdate = async ({
    model,
    filter={},
    data={}
}) => {
    return await model.findOneAndUpdate(filter,data)
}