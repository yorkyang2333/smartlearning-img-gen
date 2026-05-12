package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.ApiEndpoint;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.ApiEndpointRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApiEndpointRepository apiEndpointRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            // Create default Teacher
            User teacher = new User();
            teacher.setUsername("teacher");
            teacher.setPasswordHash(passwordEncoder.encode("123456"));
            teacher.setDisplayName("王老师 (Teacher)");
            teacher.setRole("TEACHER");
            teacher.setIsActive(true);
            userRepository.save(teacher);

            // Create default Student
            User student = new User();
            student.setUsername("student");
            student.setPasswordHash(passwordEncoder.encode("123456"));
            student.setDisplayName("小明 (Student)");
            student.setRole("STUDENT");
            student.setTeacherId(teacher.getId());
            student.setIsActive(true);
            userRepository.save(student);

            System.out.println("✅ 已自动创建测试账号：");
            System.out.println("教师账号 - 用户名: teacher, 密码: 123456");
            System.out.println("学生账号 - 用户名: student, 密码: 123456");

            // Create Default ChatAnywhere Endpoint
            ApiEndpoint chatAnywhere = new ApiEndpoint();
            chatAnywhere.setName("ChatAnywhere");
            chatAnywhere.setBaseUrl("https://api.chatanywhere.tech/v1");
            chatAnywhere.setApiKey("sk-your-chatanywhere-key-here");
            apiEndpointRepository.save(chatAnywhere);

            // Create Default Models
            modelRepository.save(createModel("GPT-5.5 (前沿模型)", "gpt-5.5", "BOTH", "openai", "openai最新的前沿模型，专为处理最复杂的专业工作而设计", chatAnywhere.getId()));
            modelRepository.save(createModel("GPT-5.4-mini", "gpt-5.4-mini", "BOTH", "openai", "openai最强大的编码、计算机使用和子代理迷你模型", chatAnywhere.getId()));
            modelRepository.save(createModel("GPT-5.1 (旗舰模型)", "gpt-5.1", "BOTH", "openai", "用于编码和智能体任务的旗舰模型", chatAnywhere.getId()));
            modelRepository.save(createModel("o3-mini (推理模型)", "o3-mini", "TEXT_GENERATION", "openai", "针对复杂任务的推理模型", chatAnywhere.getId()));
            modelRepository.save(createModel("o4-mini", "o4-mini", "TEXT_GENERATION", "openai", "为数学、科学、编码、视觉推理任务和技术写作设定了新的标准", chatAnywhere.getId()));
            modelRepository.save(createModel("GPT-4o (多模态)", "gpt-4o", "BOTH", "openai", "速度更快更聪明，支持多模态", chatAnywhere.getId()));
            modelRepository.save(createModel("Gemini 2.5 Pro", "gemini-2.5-pro", "BOTH", "google", "Google最新的旗舰模型", chatAnywhere.getId()));
            modelRepository.save(createModel("Claude Opus 4.7", "claude-opus-4-7", "BOTH", "anthropic", "Claude的高级模型", chatAnywhere.getId()));
            modelRepository.save(createModel("DeepSeek V4 Pro", "deepseek-v4-pro", "TEXT_GENERATION", "deepseek", "Deepseek的聊天模型", chatAnywhere.getId()));
            modelRepository.save(createModel("Qwen3 Max", "qwen3-max-2026-01-23", "TEXT_GENERATION", "alibaba", "Qwen的旗舰模型", chatAnywhere.getId()));
            modelRepository.save(createModel("DALL-E 3 (生图)", "dall-e-3", "TEXT_TO_IMAGE", "openai", "高质量AI图像生成模型", chatAnywhere.getId()));
            modelRepository.save(createModel("GPT Image 2", "gpt-image-2", "TEXT_TO_IMAGE", "openai", "优质AI图像生成", chatAnywhere.getId()));
            modelRepository.save(createModel("Gemini 3.1 Flash Image", "gemini-3.1-flash-image-preview", "TEXT_TO_IMAGE", "google", "Google Gemini的高速生图模型", chatAnywhere.getId()));

            // Set up Default Tutor Config
            TutorConfig tutorConfig = new TutorConfig();
            tutorConfig.setTeacherId(teacher.getId());
            tutorConfig.setEnabled(true);
            tutorConfig.setModelName("gpt-4o");
            tutorConfig.setApiEndpointId(chatAnywhere.getId());
            tutorConfig.setSystemPrompt("你是一个专业、耐心、富有启发性的AI美术导师。请用温和、鼓励的语气指导学生进行艺术创作。");
            tutorConfigRepository.save(tutorConfig);

            System.out.println("✅ 已自动配置默认 ChatAnywhere 渠道、模型和 AI 学伴。");
            System.out.println("⚠️ 请登录教师端，在【系统配置】中更新真实的 API Key。");
        }
    }

    private Model createModel(String name, String modelId, String type, String provider, String desc, String endpointId) {
        Model m = new Model();
        m.setName(name);
        m.setModelId(modelId);
        m.setType(type);
        m.setProvider(provider);
        m.setDescription(desc);
        m.setConfig(type.equals("TEXT_TO_IMAGE") ? "{\"sizes\":[\"1024x1024\"]}" : "{}");
        m.setApiEndpointId(endpointId);
        return m;
    }
}
