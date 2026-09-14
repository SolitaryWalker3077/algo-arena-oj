package com.oj.system.entity.question.dto;


import com.oj.common.entity.PageQueryDto;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QuestionQueryDto extends PageQueryDto {

    @Min(value = 1, message = "题目难度不能小于1")
    @Max(value = 3, message = "题目难度不能大于3")
    private Integer difficult;

    @Size(max = 100, message = "题目标题不能超过100个字符")
    private String title;


}
