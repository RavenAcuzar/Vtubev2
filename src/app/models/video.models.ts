
export type VideoDetails = {
        rowNumber:number,// 1,
        videoUrl:string,// "",
        runningNum:string,// "45b40cfd-d557-4ffe-8404-68c1bfe439ab",
        id:string,// "6160940031001",
        bcid:string,// "6160940031001",
        name:string,// "VTUBE.NET is here ",
        videoUrlReal:string,// "/vtube/video?id=6160940031001",
        category:string,// "Products",
        title:string,// "VTUBE.NET is here ",
        points:string,// "40",
        level:string,// "Beginner",
        likes:number,// 3,
        comments:number,// 1,
        image:string,// "https://cf-images.ap-southeast-1.prod.boltdns.net/v1/static/3745659807001/a1331035-3d33-448a-b705-fc090f37db87/934e4bb7-2a44-48f1-833d-f144edbb53d5/360x360/match/image.jpg",
        description:string,// "The best video training platfrom that can give a express road to MAXOUT",
        days:string,// "June 01, 2020",
        time:string,// "00:00:30",
        views:number,// 1282,
        premium:string,// "private",
        language:string,// "EN",
        videoDl:string,// "Locked",
        videoPrivacy:string,// "public",
        is_recommended:boolean,// true,
        createdOn:string,// "2020-06-01T20:58:13.18",
        isapproved:boolean,// true,
        tags:string,// "Maxout",
        channelName:string,// "QNET BUSINESS",
        channelId:number,// 75,
        plays:number,// 1764,
        user_id:string,// "1dc33229-4e73-4c15-81df-43584ddfa646",
        isHighlighted:boolean,// false,
        imageUser:string,// "/Widgets_Site/avatar.ashx?id=1DC33229-4E73-4C15-81DF-43584DDFA646",
        createdBy:string,// "Hamid Kazem",
        ownerRank:string,// "",
        ownerJoined:string,// "January 01, 2013",
        channel1:string,// null,
        channel2:string,// null,
        channel3:string,// null,
        channel4:string,// null,
        channel5:string,// null
        channelImage:string,
        t_title:string,
        t_desc:string
}

export type VideoComment = {
    Id: string,
    UserId: string,
    Comment: string,
    CreatedOn: string,
    CreatedBy: string,
    avatar:string,
    
}