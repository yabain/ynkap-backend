export class UtilsFunc
{
    static generateUniqueRef()
    {
        return `REF${new Date().getTime()}`
    }
}