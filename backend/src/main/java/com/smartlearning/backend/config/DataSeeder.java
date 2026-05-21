package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.ClassGroup;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.ClassGroupRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("seed")
@Order(10)
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    @Autowired
    private ClassGroupRepository classGroupRepository;

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

            // Create default class and assign student
            ClassGroup defaultClass = new ClassGroup();
            defaultClass.setName("默认班级");
            defaultClass.setTeacherId(teacher.getId());
            defaultClass.setSortOrder(0);
            classGroupRepository.save(defaultClass);

            student.setClassGroupId(defaultClass.getId());
            userRepository.save(student);

            System.out.println("✅ 已自动创建测试账号：");
            System.out.println("教师账号 - 用户名: teacher, 密码: 123456");
            System.out.println("学生账号 - 用户名: student, 密码: 123456");

            // Create Default Models
            modelRepository.save(createModel("GPT Image 2", "gpt-image-2", "BOTH", "openai", "优质AI图像生成与编辑"));
            modelRepository.save(createModel("DALL-E 3", "dall-e-3", "TEXT_TO_IMAGE", "openai", "高质量AI图像生成模型"));
            modelRepository.save(createModel("FLUX Schnell", "flux-schnell", "TEXT_TO_IMAGE", "stability", "快速高质量生图"));
            modelRepository.save(createModel("FLUX Dev", "flux-dev", "TEXT_TO_IMAGE", "stability", "高质量生图（开发版）"));
            modelRepository.save(createModel("Gemini 3.1 Flash Lite", "gemini-3.1-flash-lite", "TEXT_GENERATION", "google", "极速文本分析与导师对话"));
            modelRepository.save(createModel("DeepSeek Chat", "deepseek-chat", "TEXT_GENERATION", "deepseek", "高速文本分析与导师对话"));

            // Set up Default Tutor Config
            TutorConfig tutorConfig = new TutorConfig();
            tutorConfig.setTeacherId(teacher.getId());
            tutorConfig.setEnabled(true);
            tutorConfig.setModelName("gemini-3.1-flash-lite");
            tutorConfig.setApiEndpointId(null);
            tutorConfig.setSystemPrompt("你是一个专业、耐心、富有启发性的AI美术导师。请始终用中文、以温和鼓励的语气指导学生进行艺术创作。");
            tutorConfigRepository.save(tutorConfig);

            System.out.println("✅ 已自动配置默认模型目录和 AI 导师。");
            System.out.println("⚠️ 请在教师管理页面中配置 AI API 连接（URL 和 Key）。");
        }
    }

    private Model createModel(String name, String modelId, String type, String provider, String desc) {
        Model m = new Model();
        m.setName(name);
        m.setModelId(modelId);
        m.setType(type);
        m.setProvider(provider);
        m.setDescription(desc);
        m.setApiFormat("openai");
        m.setConfig(("TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type))
            ? ModelConfigUtil.buildImageConfigJson(modelId, m.getApiFormat())
            : "{}");
        m.setApiEndpointId(null);
        return m;
    }
}
