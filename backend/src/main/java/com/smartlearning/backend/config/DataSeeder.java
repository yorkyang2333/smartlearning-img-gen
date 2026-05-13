package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.ApiEndpoint;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.ApiEndpointRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
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
        m.setApiFormat("openai");
        m.setConfig(type.equals("TEXT_TO_IMAGE")
            ? ModelConfigUtil.buildImageConfigJson(modelId, m.getApiFormat())
            : "{}");
        m.setApiEndpointId(endpointId);
        return m;
    }
}
