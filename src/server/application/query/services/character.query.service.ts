import {
    IUserCharacterProgressCommandRepo,
    IUserCharacterProgressQueryRepo,
} from "../../port/repo/I.user.character.progress.repo";
import { CharacterMapper } from "../mapper/character.mapper";
import { CharacterProgressView } from "../view/character.view";

export class CharacterQueryService {
    constructor(
        private characterQueryRepo: IUserCharacterProgressQueryRepo,
        private characterCommandRepo: IUserCharacterProgressCommandRepo,
    ) {}

    async getCharacterProgress(userId: string): Promise<CharacterProgressView> {
        const row =
            (await this.characterQueryRepo.findByUserId(userId)) ??
            (await this.characterCommandRepo.findOrCreate(userId));
        return CharacterMapper.toProgressView(row);
    }
}
