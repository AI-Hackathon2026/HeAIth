import path from "path";
import { AuthCommandService } from "./application/command/services/auth.command.service";
import { CharacterCommandService } from "./application/command/services/character.command.service";
import { ChatCommandService } from "./application/command/services/chat.command.service";
import { ChatbotCommandService } from "./application/command/services/chatbot.command.service";
import { FileCommandService } from "./application/command/services/file.command.service";
import { HealthRecordCommandService } from "./application/command/services/health-record.command.service";
import { HealthstatusCommandService } from "./application/command/services/healthstatus.command.service";
import { RoutineCommandService } from "./application/command/services/routine.command.service";
import { UserCommandService } from "./application/command/services/user.command.service";
import { CharacterQueryService } from "./application/query/services/character.query.service";
import { ChatQueryService } from "./application/query/services/chat.query.service";
import { FileQueryService } from "./application/query/services/file.query.service";
import { HealthRecordQueryService } from "./application/query/services/health-record.query.service";
import { RagQueryService } from "./application/query/services/rag.query.service";
import { RoutineQueryService } from "./application/query/services/routine.query.service";
import { UserQueryService } from "./application/query/services/user.query.service";
import { KnhanesService } from "./application/services/knhanes.service";
import { AuthMiddleware } from "./Inbound/middlewares/auth.middleware";
import { Gemini } from "./outbound/chatbot/gemini";
import { KnhanesAdapter } from "./outbound/data/knhanes.adapter";
import { DocumentLibrary, LocalUploadStorage } from "./outbound/documents/document.library";
import { BlobDbStorage, BlobUploadStorage, isBlobConfigured } from "./outbound/store/blob.storage";
import { ScryptHashManager } from "./outbound/managers/scrypt-hash.manager";
import {
    PlanProgressEventCommandRepo,
    PlanProgressEventQueryRepo,
    UserCharacterProgressCommandRepo,
    UserCharacterProgressQueryRepo,
} from "./outbound/repo/character.repo";
import { ChatCommandRepo, ChatQueryRepo, MessageCommandRepo } from "./outbound/repo/chat.repo";
import {
    FileCommandRepo,
    FileQueryRepo,
    RagStoreCommandRepo,
    RagStoreQueryRepo,
} from "./outbound/repo/file.repo";
import {
    DiseaseRateQueryRepo,
    HealthRecordCommandRepo,
    HealthRecordQueryRepo,
    HealthstatusCommandRepo,
    HealthStatusQueryRepo,
} from "./outbound/repo/health.repo";
import {
    DailyRoutineCommandRepo,
    ExercisePlanCommandRepo,
    ExercisePlanQueryRepo,
    NutritionFoodItemCommandRepo,
    NutritionFoodItemQueryRepo,
    NutritionPlanCommandRepo,
    NutritionPlanQueryRepo,
    NutritionSummaryCommandRepo,
    RoutineCommandRepo,
    RoutineQueryRepo,
} from "./outbound/repo/routine.repo";
import { UserCommandRepo, UserQueryRepo } from "./outbound/repo/user.repo";
import { JsonStore } from "./outbound/store/json.store";
import { UnitOfWork } from "./outbound/unit.of.work";
import { ConfigUtil } from "./shared/utils/config.util";
import { CookieUtil } from "./shared/utils/cookie.util";
import { TokenUtil } from "./shared/utils/token.util";

function createContainer() {
    const config = new ConfigUtil();
    const { RUNTIME_DATA_DIR, BUNDLED_DATA_DIR } = config.parsed();

    // With a Vercel Blob store connected, db.json and uploaded PDFs live in Blob so
    // every serverless instance shares them; otherwise they are files under data/.
    const useBlob = isBlobConfigured();
    if (!useBlob && process.env.VERCEL) {
        console.warn("[store] No Vercel Blob store connected: data is kept in /tmp and will not persist.");
    }
    const store = new JsonStore(
        path.join(RUNTIME_DATA_DIR, "db.json"),
        useBlob ? new BlobDbStorage() : null,
    );
    const library = new DocumentLibrary(
        store,
        path.join(BUNDLED_DATA_DIR, "documents"),
        useBlob ? new BlobUploadStorage() : new LocalUploadStorage(path.join(RUNTIME_DATA_DIR, "uploads")),
        path.join(process.cwd(), "public", "documents"),
    );

    const tokenUtil = new TokenUtil(config);
    const unitOfWork = new UnitOfWork();
    const hashManager = new ScryptHashManager();
    const cookieUtil = new CookieUtil(config);

    // Repos
    const userCommandRepo = new UserCommandRepo(store);
    const userQueryRepo = new UserQueryRepo(store);
    const messageCommandRepo = new MessageCommandRepo(store);
    const chatCommandRepo = new ChatCommandRepo(store);
    const chatQueryRepo = new ChatQueryRepo(store);
    const fileQueryRepo = new FileQueryRepo(library);
    const fileCommandRepo = new FileCommandRepo(store, library);
    const ragStoreCommandRepo = new RagStoreCommandRepo(store);
    const ragStoreQueryRepo = new RagStoreQueryRepo(store);
    const healthstatusCommandRepo = new HealthstatusCommandRepo(store);
    const healthRecordCommandRepo = new HealthRecordCommandRepo(store);
    const healthRecordQueryRepo = new HealthRecordQueryRepo(store);
    const healthStatusQueryRepo = new HealthStatusQueryRepo(store);
    const diseaseRateQueryRepo = new DiseaseRateQueryRepo();
    const routineCommandRepo = new RoutineCommandRepo(store);
    const routineQueryRepo = new RoutineQueryRepo(store);
    const dailyRoutineCommandRepo = new DailyRoutineCommandRepo(store);
    const nutritionPlanCommandRepo = new NutritionPlanCommandRepo(store);
    const nutritionFoodItemCommandRepo = new NutritionFoodItemCommandRepo(store);
    const nutritionSummaryCommandRepo = new NutritionSummaryCommandRepo(store);
    const exercisePlanCommandRepo = new ExercisePlanCommandRepo(store);
    const nutritionPlanQueryRepo = new NutritionPlanQueryRepo(store);
    const nutritionFoodItemQueryRepo = new NutritionFoodItemQueryRepo(store);
    const exercisePlanQueryRepo = new ExercisePlanQueryRepo(store);
    const characterProgressQueryRepo = new UserCharacterProgressQueryRepo(store);
    const characterProgressCommandRepo = new UserCharacterProgressCommandRepo(store);
    const planProgressEventQueryRepo = new PlanProgressEventQueryRepo(store);
    const planProgressEventCommandRepo = new PlanProgressEventCommandRepo(store);

    // AI
    const gemini = new Gemini(config, store);
    const models = { gemini };

    // Services
    const chatCommandService = new ChatCommandService(chatCommandRepo, messageCommandRepo);
    const chatbotCommandService = new ChatbotCommandService(
        models,
        unitOfWork,
        chatCommandService,
        ragStoreQueryRepo,
        fileQueryRepo,
    );
    const chatQueryService = new ChatQueryService(chatQueryRepo);
    const knhanesService = new KnhanesService(new KnhanesAdapter());
    const userCommandService = new UserCommandService(unitOfWork, hashManager, userCommandRepo);
    const userQueryService = new UserQueryService(userQueryRepo, hashManager);
    const authCommandService = new AuthCommandService(
        unitOfWork,
        config,
        hashManager,
        tokenUtil,
        userCommandRepo,
    );
    const healthRecordCommandService = new HealthRecordCommandService(
        unitOfWork,
        healthRecordCommandRepo,
        healthRecordQueryRepo,
        healthStatusQueryRepo,
        diseaseRateQueryRepo,
    );
    const healthRecordQueryService = new HealthRecordQueryService(healthRecordQueryRepo, healthStatusQueryRepo);
    const healthstatusCommandService = new HealthstatusCommandService(
        unitOfWork,
        healthstatusCommandRepo,
        healthRecordCommandService,
    );
    const characterQueryService = new CharacterQueryService(
        characterProgressQueryRepo,
        characterProgressCommandRepo,
    );
    const characterCommandService = new CharacterCommandService(
        characterProgressCommandRepo,
        characterProgressQueryRepo,
        planProgressEventQueryRepo,
        planProgressEventCommandRepo,
    );
    const routineCommandService = new RoutineCommandService(
        unitOfWork,
        models,
        routineCommandRepo,
        routineQueryRepo,
        healthStatusQueryRepo,
        healthRecordQueryRepo,
        dailyRoutineCommandRepo,
        nutritionPlanCommandRepo,
        nutritionSummaryCommandRepo,
        exercisePlanCommandRepo,
        nutritionPlanQueryRepo,
        nutritionFoodItemCommandRepo,
        nutritionFoodItemQueryRepo,
        exercisePlanQueryRepo,
        fileQueryRepo,
        characterCommandService,
        chatCommandRepo,
        chatQueryRepo,
        messageCommandRepo,
    );
    const routineQueryService = new RoutineQueryService(routineQueryRepo, characterQueryService);
    const fileQueryService = new FileQueryService(fileQueryRepo);
    const ragQueryService = new RagQueryService(ragStoreQueryRepo, gemini);
    const fileCommandService = new FileCommandService(
        unitOfWork,
        fileCommandRepo,
        ragStoreCommandRepo,
        ragStoreQueryRepo,
        gemini,
    );

    return {
        config,
        store,
        library,
        tokenUtil,
        cookieUtil,
        auth: new AuthMiddleware(tokenUtil),
        authCommandService,
        userCommandService,
        userQueryService,
        chatCommandService,
        chatQueryService,
        chatbotCommandService,
        knhanesService,
        fileCommandService,
        fileQueryService,
        ragQueryService,
        healthstatusCommandService,
        healthRecordCommandService,
        healthRecordQueryService,
        characterCommandService,
        characterQueryService,
        routineCommandService,
        routineQueryService,
    };
}

export type Container = ReturnType<typeof createContainer>;

// Reuse one container per process (and across hot reloads in `next dev`).
const globalForContainer = globalThis as unknown as { __heaithContainer?: Container };

export function getContainer(): Container {
    globalForContainer.__heaithContainer ??= createContainer();
    return globalForContainer.__heaithContainer;
}
