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
            Model gpt4o = new Model();
            gpt4o.setName("GPT-4o (AI学伴)");
            gpt4o.setModelId("gpt-4o");
            gpt4o.setType("BOTH");
            gpt4o.setProvider("openai");
            gpt4o.setDescription("高性能大语言模型，擅长对话与提示词优化");
            gpt4o.setConfig("{}");
            gpt4o.setApiEndpointId(chatAnywhere.getId());
            modelRepository.save(gpt4o);

            Model dallE3 = new Model();
            dallE3.setName("DALL-E 3 (生图)");
            dallE3.setModelId("dall-e-3");
            dallE3.setType("TEXT_TO_IMAGE");
            dallE3.setProvider("openai");
            dallE3.setDescription("高质量AI图像生成模型");
            dallE3.setConfig("{\"sizes\":[\"1024x1024\"]}");
            dallE3.setApiEndpointId(chatAnywhere.getId());
            modelRepository.save(dallE3);

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
}
