import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { User, UserDocument } from "../models/user.shema";
import { DataBaseService } from "src/shared/database/database.service";
 
@Injectable()
export class UserService extends DataBaseService<UserDocument> {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>,
                @InjectConnection() connection:mongoose.Connection){
                    super(userModel, connection)
                }
                
    async findALL(): Promise<UserDocument[]>
    {
        return this.entityModel.find<UserDocument>().sort({createdAt:1}).populate(["sub"]).exec();
    }

    async findByField(entityObj:Record<string,any>):Promise<UserDocument[]>
    {
        return this.entityModel.find<UserDocument>({where:entityObj}).sort({createdAt:1}).populate(["sub"]).exec();
    }

    async findOneByField(entityObj:Record<string,any>):Promise<UserDocument>
    {
        return this.entityModel.findOne<UserDocument>(entityObj).populate(["sub"]).exec();
    }
}