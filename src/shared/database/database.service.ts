    import { Injectable } from "@nestjs/common"
    import mongoose, { ClientSession, Document, Model } from "mongoose";

    @Injectable()
    export abstract class DataBaseService<T extends Document>
    {
        constructor(
            public entityModel:Model<T>,
            public connection:mongoose.Connection,
            public toPopuloate:string[]=[]
            ){}

            createInstance(createEntityDTO)
            {
                return new this.entityModel(createEntityDTO);  
            }
            
            async create(createEntityDTO,session=null):Promise<T>
            {
                return new this.entityModel(createEntityDTO).save({session});
            }
        
            async createMany(createEntityDTO:any[],session=null):Promise<any>
            {
                return this.entityModel.insertMany(createEntityDTO,{session});
            }
        
            async findByPage(select:Record<string,any>={},page=1,limit=10)
            {
                return this.entityModel.find(select).sort({createdAt:1}).limit(limit).skip(page*limit).populate(this.toPopuloate).exec()
            }
        
            async findAll(sortby: Record<string,any> = {createdAt:1}): Promise<T[]>
            {
                return this.entityModel.find<T>().sort(sortby).populate(this.toPopuloate).exec();
            }
        
            async findById(id:string,session,select:Record<string,any>={}):Promise<T>
            {
                return this.entityModel.findOne<T>({_id: id}).session(session).select(select).exec().then((result)=>result?result.populate(this.toPopuloate):null);
            }
        
            // async findByField(entityObj:Record<string,any>):Promise<T[]>
            // {
            //     return this.entityModel.find<T>({where:entityObj}).sort({createdAt:1}).populate(this.toPopuloate).exec();
            // }

            async findByField(entityObj: Record<string, any>, session?: ClientSession, options?: { allowDiskUse?: boolean }): Promise<T[]> {
                console.log('DatabaseService.findByField appelé avec:', entityObj);
                try {
                    // Créer la requête de base
                    const query = this.entityModel.find<T>(entityObj);
                    
                    // Ajouter l'option allowDiskUse si elle est fournie
                    if (options?.allowDiskUse) {
                        query.allowDiskUse(true);
                    }
                    
                    // Utiliser this.toPopuloate pour les relations
                    if (this.toPopuloate && this.toPopuloate.length > 0) {
                        this.toPopuloate.forEach(field => {
                            query.populate(field);
                        });
                    }
                    
                    // Exécuter la requête avec la session si fournie
                    if (session) {
                        return await query.session(session).exec();
                    }
                    
                    return await query.exec();
                } catch (error) {
                    console.error('Erreur dans findByField:', error);
                    throw error;
                }
            }
            
        
            async findOneByField(entityObj:Record<string,any>,select:Record<string,any>={},session=null):Promise<T>
            {
                // return this.entityModel.findOne<T>(entityObj).exec();
                return this.entityModel.findOne<T>(entityObj).select(select).exec().then((result)=>result?result.populate(this.toPopuloate):null);
        
            }
        
        
            async update(filter:Record<string,any>,toUpdate:Record<string,any>,session=null):Promise<T>
            {
                return this.entityModel.findOneAndUpdate<T>(filter,toUpdate,{session,new:true});
            }
        
            async delete(filter,session=null)
            {
                await this.entityModel.findOneAndDelete(filter,{session});
            }
        
            bulkOperator(ops:any[],session:ClientSession=null):Promise<any>
            {
                return this.entityModel.bulkWrite(ops,{session});
            }
        
            async executeWithTransaction(functionToExecute:(session:ClientSession)=>any):Promise<any>
            {
        
                const transaction:ClientSession= await this.connection.startSession();
                transaction.startTransaction();
                let result=null;
                try {    
                    result= await functionToExecute(transaction);
                    await transaction.commitTransaction();
                } 
                catch(err)
                {
                    await transaction.abortTransaction();
                    throw err
                }
                finally
                {
                    transaction.endSession();
                }     
                return  result;
            }
        }
