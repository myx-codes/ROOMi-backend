import { Types } from 'mongoose'; // bson o'rniga mongoose ishlatish tavsiya etiladi
import { randomUUID } from 'crypto';
import * as path from 'path';
import { T } from './types/common';

/** SORTING CONFIGURATIONS **/
export const availableAgentSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews", "memberRank"];
export const availableMemberSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews"];

// Barter olib tashlandi, faqat Rent qoldi (ijara uchun)
export const availableOptions = ['propertyRent']; 

export const availablePropertySorts = [
    'createdAt',
    'updatedAt',
    'propertyLikes',
    'propertyViews',
    'propertyRank',
    'propertyRatingCount',
    'propertyPrice',
];

export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt', 'commentStars'];

/** IMAGE CONFIGURATION **/
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/avif',  'image/webp'];
export const getSerialForImage = (filename: string) => {
    const ext = path.parse(filename).ext;
    return randomUUID() + ext;
};

/** MONGOOSE UTILS **/
export const shapeIntoMongoObjectId = (target: any) => {
    return typeof target === 'string' ? new Types.ObjectId(target) : target;
};

/** SANA (YYYY-MM-DD) – backend da yil/oy/sana sifatida ishlash **/
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" stringini UTC kun boshiga (00:00:00.000Z) Date qilib qaytaradi */
export const parseDateOnly = (dateStr: string): Date => {
    if (!dateStr || !YMD_REGEX.test(dateStr)) {
        throw new Error(`Invalid date format. Use YYYY-MM-DD: ${dateStr}`);
    }
    return new Date(`${dateStr}T00:00:00.000Z`);
};

/** Date ni "YYYY-MM-DD" stringiga aylantiradi (UTC bo‘yicha) */
export const formatDateOnly = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/** AGGREGATIONS **/

// Dacha yoki Maqolaga foydalanuvchi layk bosganini tekshirish
export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
    return {
        $lookup: {
            from: 'likes',
            let: {
                localLikeRefId: targetRefId,
                localMemberId: memberId,
                localMyFavorite: true
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$likeRefId', '$$localLikeRefId'] },
                                { $eq: ['$memberId', '$$localMemberId'] }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        memberId: 1,
                        likeRefId: 1,
                        myFavorite: '$$localMyFavorite',
                    }
                }
            ],
            as: 'meLiked'
        }
    };
};

// Dacha egasi (Agent) haqida ma'lumotlarni ulash
export const lookupMember = {
    $lookup: {
        from: 'members',
        localField: 'memberId',
        foreignField: '_id',
        as: 'memberData',
    },
};

// Sevimli dachalar ro'yxatida agent ma'lumotlarini ulash
export const lookupFavorite = {
    $lookup: {
        from: 'members',
        localField: 'favoriteProperty.memberId',
        foreignField: '_id',
        as: 'favoriteProperty.memberData',
    },
};

// Oxirgi ko'rilgan dachalar ro'yxatida agent ma'lumotlarini ulash
export const lookupVisited = {
    $lookup: {
        from: 'members',
        localField: 'visitedProperty.memberId',
        foreignField: '_id',
        as: 'visitedProperty.memberData',
    },
};
