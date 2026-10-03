package com.oj.friend.entity.question.dto;


import com.oj.common.entity.PageQueryDto;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QuestionQueryDto extends PageQueryDto {

    @Parameter(description = "搜索关键字，不传则不按关键字筛选", required = false)
    @Size(max = 100, message = "搜索关键字不能超过100个字符")
    private String keyword;

    @Parameter(description = "题目难度：1简单、2中等、3困难；不传则查询全部难度", required = false)
    @Min(value = 1, message = "题目难度不能小于1")
    @Max(value = 3, message = "题目难度不能大于3")
    private Integer difficult;
}
