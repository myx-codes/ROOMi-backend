import { registerEnumType } from '@nestjs/graphql';

export enum BoardArticleCategory {
    NEWS = 'NEWS',         // Platforma yangiliklari
    FREE = 'FREE',         // Savol-javob yoki erkin mavzu
    RECOMMEND = 'RECOMMEND', // Tavsiyalar (masalan: "Eng chiroyli dam olish maskanlari")
    HELP = 'HELP',         // Yordam (masalan: "Qanday qilib dacha ijaraga olish mumkin?")
    EVENT = 'EVENT',       // Tadbirlar (masalan: "Dachada o'tkaziladigan bayramlar")
    LIFESTYLE = 'LIFESTYLE' // Hayot tarzi (masalan: "Tabiat qo'ynida dam olishning foydasi")
}

registerEnumType(BoardArticleCategory, {
    name: 'BoardArticleCategory',
    description: 'ROOMi platformasidagi maqolalar kategoriyalari',
});

export enum BoardArticleStatus {
    ACTIVE = 'ACTIVE',     // Saytda ko'rinadi
    WAITING = 'WAITING',   // Admin tasdig'ini kutmoqda (Moderatsiya)
    HOLD = 'HOLD',         // Vaqtincha ushlab turilgan
    DELETE = 'DELETE',     // O'chirilgan
}

registerEnumType(BoardArticleStatus, {
    name: 'BoardArticleStatus',
    description: 'Maqolalarning holati'
});
