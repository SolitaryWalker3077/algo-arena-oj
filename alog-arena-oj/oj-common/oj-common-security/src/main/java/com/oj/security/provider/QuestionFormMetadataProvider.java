package com.oj.security.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 *  加载并缓存管理问题表单所使用的版本化 JSON 模式。
 *  更新资源可更改字段、验证规则和布局，而无需重建前端。
 */
@Component
public class QuestionFormMetadataProvider {

    private static final String RESOURCE_PATH = "question-form-metadata.json";

    private final ObjectMapper objectMapper;
    private volatile Map<String, Object> metadata;

    public QuestionFormMetadataProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * 返回缓存的元数据文档，首次使用时从类路径加载一次。
     *
     * @return 按约定不可变的 JSON 对象发送到前端
     */
    public Map<String, Object> getMetadata() {
        Map<String, Object> current = metadata;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (metadata == null) {
                metadata = loadMetadata();
            }
            return metadata;
        }
    }

    private Map<String, Object> loadMetadata() {
        ClassPathResource resource = new ClassPathResource(RESOURCE_PATH);
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readValue(input, new TypeReference<>() { });
        } catch (IOException exception) {
            throw new IllegalStateException("无法加载题目表单元数据: " + RESOURCE_PATH, exception);
        }
    }
}
